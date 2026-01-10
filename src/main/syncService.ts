import { getDb } from "../db";
import { ipcMain } from "electron";
import { logger } from "./logger";
import { getHWID } from "./licenseService";


/**
 * Get the cloud URL from environment variables.
 * This is a function to ensure it's evaluated AFTER dotenv loads the .env file.
 */
function getCloudUrl(): string {
  const url = process.env.CLOUD_URL;
  if (!url) {
    throw new Error('CLOUD_URL is not defined in environment variables. Please check your .env file.');
  }
  return url;
}


export class SyncService {
  private db = getDb();

  /**
   * Main synchronization cycle: Push dirty data -> Pull remote updates
   */
  async syncWithCloud(): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    let syncType = "FULL_SYNC"; // Default to full if no last sync
    let status = "SUCCESS";
    let errorMessage = "";
    const stats: Record<string, { pushed: number; pulled: number }> = {};

    try {
      const schoolIdResult = this.db.prepare("SELECT value FROM settings WHERE key = 'school_id'").get() as { value: string } | undefined;
      const licenseTokenResult = this.db.prepare("SELECT value FROM settings WHERE key = 'license_token'").get() as { value: string } | undefined;
      const lastSyncResult = this.db.prepare("SELECT value FROM settings WHERE key = 'last_sync_time'").get() as { value: string } | undefined;

      if (lastSyncResult) syncType = "DELTA_SYNC";

      if (!schoolIdResult || !licenseTokenResult) {
        console.log("Sync skipped: No school ID or license token found.");
        return { success: false, error: "NOT_LINKED" };
      }

      const schoolId = schoolIdResult.value;
      const licenseToken = licenseTokenResult.value;

      console.log(`Starting ${syncType} cycle...`);
      logger.info(`Starting ${syncType} cycle for school ${schoolId}.`);

      // --- PHASE 1: PUSH ---
      const pushResults = await this.performPush(schoolId, licenseToken);
      Object.entries(pushResults).forEach(([table, count]) => {
        if (!stats[table]) stats[table] = { pushed: 0, pulled: 0 };
        stats[table].pushed = count;
      });

      // --- PHASE 2: PULL ---
      const pullResults = await this.performPull(schoolId, licenseToken);
      Object.entries(pullResults).forEach(([table, count]) => {
        if (!stats[table]) stats[table] = { pushed: 0, pulled: 0 };
        stats[table].pulled = count;
      });

      console.log("Sync cycle completed successfully.");
      logger.info(`Sync cycle completed successfully in ${Date.now() - startTime}ms. Stats: ${JSON.stringify(stats)}`);
    } catch (error: any) {
      status = "ERROR";
      errorMessage = error.message;
      console.error("Sync error:", error);
      logger.error(`Sync cycle failed. Type: ${syncType}`, error);
    } finally {
      const durationMs = Date.now() - startTime;
      await this.logSyncHistory(syncType, status, stats, errorMessage, durationMs);
    }

    return status === "SUCCESS" ? { success: true } : { success: false, error: errorMessage };
  }

  /**
   * Gathers dirty data and pushes it to the cloud
   */
  private async performPush(schoolId: string, licenseToken: string): Promise<Record<string, number>> {
    const pushedCounts: Record<string, number> = {};
    const dirtyData = {
      academicYears: this.db.prepare("SELECT id as localId, name, start_date as startDate, end_date as endDate, is_active as isCurrent, last_modified_at FROM academic_years WHERE is_dirty = 1").all(),
      classes: this.db.prepare("SELECT c.id as localId, c.name, c.level, c.option, c.section, c.academic_year_id as academicYearLocalId, c.last_modified_at FROM classes c WHERE c.is_dirty = 1").all(),
      domains: this.db.prepare("SELECT id as localId, name, display_order as displayOrder, last_modified_at FROM domains WHERE is_dirty = 1").all(),
      students: this.db.prepare(`
        SELECT 
          id as localId, first_name as firstName, last_name as lastName, post_name as postName,
          gender, birth_date as birthDate, birthplace,
          conduite, conduite_p1 as conduiteP1, conduite_p2 as conduiteP2, conduite_p3 as conduiteP3, conduite_p4 as conduiteP4,
          is_abandoned as isAbandoned, abandon_reason as abandonReason,
          class_id as classLocalId, last_modified_at 
        FROM students WHERE is_dirty = 1
      `).all(),
      subjects: this.db.prepare(`
        SELECT 
          id as localId, name, code, 
          max_p1 as maxP1, max_p2 as maxP2, max_exam1 as maxExam1,
          max_p3 as maxP3, max_p4 as maxP4, max_exam2 as maxExam2,
          category, sub_domain as subDomain, domain_id as domainLocalId,
          class_id as classLocalId, last_modified_at 
        FROM subjects WHERE is_dirty = 1
      `).all(),
      grades: this.db.prepare("SELECT id as localId, student_id as studentId, subject_id as subjectId, period, value as points, last_modified_at FROM grades WHERE is_dirty = 1").all(),
      notes: this.db.prepare("SELECT id as localId, title, content, academic_year_id as academicYearLocalId, last_modified_at FROM notes WHERE is_dirty = 1").all(),
      deletions: this.db.prepare("SELECT table_name as tableName, local_id as localId FROM sync_deletions").all()
    };

    const schoolName = this.db.prepare("SELECT value FROM settings WHERE key = 'school_name'").get() as { value: string } | undefined;
    const schoolCity = this.db.prepare("SELECT value FROM settings WHERE key = 'school_city'").get() as { value: string } | undefined;
    const schoolPoBox = this.db.prepare("SELECT value FROM settings WHERE key = 'school_pobox'").get() as { value: string } | undefined;

    const hasDirtyRecords = Object.values(dirtyData).some(arr => (arr as any[]).length > 0);

    if (hasDirtyRecords) {
      console.log("Pushing dirty records to cloud...");
      logger.info(`Pushing dirty records: ${Object.entries(dirtyData).map(([k, v]) => `${k}:${(v as any[]).length}`).join(', ')}`);
      const fetch = (await import('node-fetch')).default;
      const hwid = getHWID();
      console.log(`Pushing to cloud for school ${schoolId} (HWID: ${hwid})`);
      if (dirtyData.notes.length > 0) {
        console.log("DEBUG: Pushing notes:", JSON.stringify(dirtyData.notes, null, 2));
      }
      const response = await fetch(`${getCloudUrl()}/api/sync/push`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${licenseToken}`,
          'x-hwid': getHWID()
        },
        body: JSON.stringify({
          schoolId,
          data: dirtyData,
          schoolInfo: {
            name: schoolName?.value || '',
            city: schoolCity?.value || '',
            pobox: schoolPoBox?.value || ''
          }
        })
      });

      if (!response.ok) {
        const err = await response.json() as any;
        throw new Error(err.error || "Cloud push failed");
      }

      const result = (await response.json()) as any;

      if (result.success) {
        // Mark everything as clean and update server_ids
        this.db.transaction(() => {
          if (result.results.academicYears) {
            const stmt = this.db.prepare("UPDATE academic_years SET server_id = ?, is_dirty = 0 WHERE id = ?");
            result.results.academicYears.forEach((r: any) => stmt.run(r.serverId, r.localId));
          }
          if (result.results.classes) {
            const stmt = this.db.prepare("UPDATE classes SET server_id = ?, is_dirty = 0 WHERE id = ?");
            result.results.classes.forEach((r: any) => stmt.run(r.serverId, r.localId));
          }
          if (result.results.domains) {
            const stmt = this.db.prepare("UPDATE domains SET server_id = ?, is_dirty = 0 WHERE id = ?");
            result.results.domains.forEach((r: any) => stmt.run(r.serverId, r.localId));
          }
          if (result.results.students) {
            const stmt = this.db.prepare("UPDATE students SET server_id = ?, is_dirty = 0 WHERE id = ?");
            result.results.students.forEach((r: any) => stmt.run(r.serverId, r.localId));
          }
          if (result.results.subjects) {
            const stmt = this.db.prepare("UPDATE subjects SET server_id = ?, is_dirty = 0 WHERE id = ?");
            result.results.subjects.forEach((r: any) => stmt.run(r.serverId, r.localId));
          }
          // Grades and Notes update (assuming simple mark as clean)
          this.db.prepare("UPDATE grades SET is_dirty = 0 WHERE is_dirty = 1").run();
          this.db.prepare("UPDATE notes SET is_dirty = 0 WHERE is_dirty = 1").run();

          // Clear successful deletions
          if (result.results.deletions) {
             const stmt = this.db.prepare("DELETE FROM sync_deletions WHERE table_name = ? AND local_id = ?");
             result.results.deletions.forEach((d: any) => {
               if (d.success) stmt.run(d.tableName, d.localId);
             });
          }
        })();
      }
      
      // Update counts
      Object.entries(dirtyData).forEach(([table, data]) => {
        pushedCounts[table] = (data as any[]).length;
      });
    }

    return pushedCounts;
  }

  /**
   * Pulls remote changes since last sync
   */
  async performPull(schoolId: string, licenseToken: string): Promise<Record<string, number>> {
    const pulledCounts: Record<string, number> = {};
    const lastSync = this.db.prepare("SELECT value FROM settings WHERE key = 'last_sync_time'").get() as { value: string } | undefined;
    const sinceParam = lastSync ? `&since=${encodeURIComponent(lastSync.value)}` : "";

    console.log(`Pulling updates from cloud (since: ${lastSync?.value || 'full sync'})...`);

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${getCloudUrl()}/api/sync/pull?schoolId=${schoolId}${sinceParam}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${licenseToken}`,
        'x-hwid': getHWID()
      }
    });

    if (!response.ok) {
      const err = await response.json() as any;
      throw new Error(err.error || "Cloud pull failed");
    }

    const { data, serverTime } = (await response.json()) as any;

    if (!data) return;

    this.db.pragma('foreign_keys = OFF');
    try {
      this.db.transaction(() => {
        // Import data into local DB (Server wins, but we only update if NOT dirty locally)
        // Note: For now, we use server-side provided data directly.
        
        // Update Domains (Must be before Subjects)
        if (data.domains) {
          const stmt = this.db.prepare(`
            INSERT INTO domains (id, name, display_order, server_id, is_dirty, last_modified_at)
            VALUES (?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, display_order = excluded.display_order, server_id = excluded.server_id,
              last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const d of data.domains) {
            stmt.run(d.localId, d.name, d.displayOrder || 0, d.id, d.updatedAt);
          }
        }

        // Update Academic Years
        if (data.academicYears) {
          const stmt = this.db.prepare(`
            INSERT INTO academic_years (id, name, start_date, end_date, is_active, server_id, is_dirty, last_modified_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date,
              is_active = excluded.is_active, server_id = excluded.server_id, last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const ay of data.academicYears) {
            stmt.run(ay.localId, ay.name, ay.startDate || '', ay.endDate || '', ay.isCurrent ? 1 : 0, ay.id, ay.updatedAt);
          }
        }

        // Update Classes
        if (data.classes) {
          const stmt = this.db.prepare(`
            INSERT INTO classes (id, name, level, option, section, academic_year_id, server_id, is_dirty, last_modified_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, level = excluded.level, option = excluded.option, section = excluded.section,
              academic_year_id = excluded.academic_year_id, server_id = excluded.server_id, last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const c of data.classes) {
            stmt.run(c.localId, c.name, (c.level || '').toString(), c.option || '', c.section || '', c.academicYearLocalId, c.id, c.updatedAt);
          }
        }

        // Update Students
        if (data.students) {
          const stmt = this.db.prepare(`
            INSERT INTO students (
              id, first_name, last_name, post_name, gender, birth_date, birthplace, 
              conduite, conduite_p1, conduite_p2, conduite_p3, conduite_p4, 
              is_abandoned, abandon_reason,
              class_id, server_id, is_dirty, last_modified_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              first_name = excluded.first_name, last_name = excluded.last_name, post_name = excluded.post_name,
              gender = excluded.gender, birth_date = excluded.birth_date, birthplace = excluded.birthplace,
              conduite = excluded.conduite, conduite_p1 = excluded.conduite_p1, conduite_p2 = excluded.conduite_p2,
              conduite_p3 = excluded.conduite_p3, conduite_p4 = excluded.conduite_p4,
              is_abandoned = excluded.is_abandoned, abandon_reason = excluded.abandon_reason,
              class_id = excluded.class_id, server_id = excluded.server_id, last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const s of data.students) {
            stmt.run(
              s.localId, s.firstName, s.lastName, s.postName || '', s.gender, s.birthDate, s.birthplace || '',
              s.conduite || '', s.conduiteP1 || '', s.conduiteP2 || '', s.conduiteP3 || '', s.conduiteP4 || '',
              s.isAbandoned ? 1 : 0, s.abandonReason || '',
              s.classLocalId, s.id, s.updatedAt
            );
          }
        }

        // Update Subjects
        if (data.subjects) {
          const stmt = this.db.prepare(`
            INSERT INTO subjects (
              id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, 
              category, sub_domain, domain_id,
              class_id, server_id, is_dirty, last_modified_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name, code = excluded.code, max_p1 = excluded.max_p1, max_p2 = excluded.max_p2,
              max_exam1 = excluded.max_exam1, max_p3 = excluded.max_p3, max_p4 = excluded.max_p4,
              max_exam2 = excluded.max_exam2, category = excluded.category, sub_domain = excluded.sub_domain,
              domain_id = excluded.domain_id, class_id = excluded.class_id, server_id = excluded.server_id,
              last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const s of data.subjects) {
            stmt.run(
              s.localId, s.name, s.code || '', 
              s.maxP1 || 10, s.maxP2 || 10, s.maxExam1 || 20, s.maxP3 || 10, s.maxP4 || 10, s.maxExam2 || 20,
              s.category, s.subDomain || '', s.domainLocalId,
              s.classLocalId, s.id, s.updatedAt
            );
          }
        }

        // Update Grades
        if (data.grades) {
          const stmt = this.db.prepare(`
            INSERT INTO grades (id, student_id, subject_id, period, value, server_id, is_dirty, last_modified_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              student_id = excluded.student_id, subject_id = excluded.subject_id, period = excluded.period,
              value = excluded.value, server_id = excluded.server_id, last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const g of data.grades) {
            stmt.run(g.localId, g.studentLocalId, g.subjectLocalId, g.period.toString(), g.points, g.id, g.updatedAt);
          }
        }

        // Update Notes
        if (data.notes) {
          const stmt = this.db.prepare(`
            INSERT INTO notes (id, title, content, academic_year_id, server_id, is_dirty, last_modified_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
            ON CONFLICT(id) DO UPDATE SET
              title = excluded.title, content = excluded.content, 
              academic_year_id = excluded.academic_year_id, server_id = excluded.server_id,
              last_modified_at = excluded.last_modified_at
            WHERE is_dirty = 0
          `);
          for (const n of data.notes) {
            stmt.run(n.localId, n.title, n.content, n.academicYearLocalId, n.id, n.updatedAt);
          }
        }


        // Process Deletions
        if (data.deletions) {
          for (const del of data.deletions) {
            try {
              // We only delete if is_dirty = 0 (Dirty Guard)
              // But for deletions, it's tricky. Usually, if the server says it's gone, it's gone.
              // However, we follow the same "Dirty Guard" for consistency if needed.
              // Actually, we'll exclude the trigger for this specific delete to avoid loop, 
              // but in SQLite we just run the delete. The trigger trg_${table}_deleted WILL 
              // run and add it back to sync_deletions. 
              // TO AVOID LOOP: We should probably temporary disable the trigger or 
              // check a flag. But a simpler way is to just delete. 
              // If it's already deleted locally, no harm.
              this.db.prepare(`DELETE FROM ${del.tableName} WHERE id = ? AND is_dirty = 0`).run(del.localId);
              
              // Cleanup sync_deletions for this item if it was added by the trigger
              this.db.prepare("DELETE FROM sync_deletions WHERE table_name = ? AND local_id = ?").run(del.tableName, del.localId);
            } catch (e) {
              console.error(`Failed to apply remote deletion for ${del.tableName}:${del.localId}`, e);
            }
          }
        }

        // Update School settings
        if (data.school) {
          this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_name', ?)").run(data.school.name || '');
          this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_city', ?)").run(data.school.city || '');
          this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_pobox', ?)").run(data.school.pobox || '');
        }

        // Finally, update last_sync_time
        this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_sync_time', ?)").run(serverTime);

        // Update counts
        Object.entries(data).forEach(([table, items]) => {
          if (Array.isArray(items)) pulledCounts[table] = items.length;
        });
      })();
    } finally {
      this.db.pragma('foreign_keys = ON');
    }

    return pulledCounts;
  }

  private async logSyncHistory(type: string, status: string, stats: any, errorMessage: string, durationMs: number) {
    try {
      const recordsSynced = JSON.stringify(stats);
      
      // 1. Log to local DB
      this.db.prepare(`
        INSERT INTO sync_history (type, status, records_synced, error_message, duration_ms)
        VALUES (?, ?, ?, ?, ?)
      `).run(type, status, recordsSynced, errorMessage || null, durationMs);

      // 2. Report to Cloud
      const licenseTokenResult = this.db.prepare("SELECT value FROM settings WHERE key = 'license_token'").get() as { value: string } | undefined;
      if (licenseTokenResult) {
        const fetch = (await import('node-fetch')).default;
        await fetch(`${getCloudUrl()}/api/sync/sync-logs`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${licenseTokenResult.value}`,
            'x-hwid': getHWID()
          },
          body: JSON.stringify({
            type,
            status,
            details: stats,
            errorMessage: errorMessage || null,
            durationMs,
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.error("Failed to report sync log to cloud:", err));
      }
    } catch (err) {
      console.error("Error writing to sync_history:", err);
    }
  }

  async pullFromCloud() {
    // This is now redundant but kept for IPC handler if needed for manual "Force Pull"
    const schoolId = this.db.prepare("SELECT value FROM settings WHERE key = 'school_id'").get() as { value: string } | undefined;
    const licenseToken = this.db.prepare("SELECT value FROM settings WHERE key = 'license_token'").get() as { value: string } | undefined;
    if (!schoolId || !licenseToken) return { success: false, error: "NOT_LINKED" };
    
    try {
      await this.performPull(schoolId.value, licenseToken.value);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  initialize() {
    ipcMain.handle('sync:start', () => this.syncWithCloud());
    ipcMain.handle('sync:pull', () => this.pullFromCloud());
    
    // Auto-sync every 5 minutes if linked
    setInterval(() => this.syncWithCloud(), 5 * 60 * 1000);

    // Self-healing: Repair corrupted grades from previous bad sync (CUIDs in integer columns)
    try {
      // 1. Repair Student IDs
      const corruptStudentGrades = this.db.prepare("SELECT id, student_id FROM grades WHERE typeof(student_id) = 'text'").all() as any[];
      if (corruptStudentGrades.length > 0) {
        console.log(`Found ${corruptStudentGrades.length} grades with corrupt student_id`);
        const updateStmt = this.db.prepare("UPDATE grades SET student_id = ? WHERE id = ?");
        const deleteStmt = this.db.prepare("DELETE FROM grades WHERE id = ?");
        
        for (const g of corruptStudentGrades) {
          const student = this.db.prepare("SELECT id FROM students WHERE server_id = ?").get(g.student_id) as { id: number } | undefined;
          if (student) {
            try {
              updateStmt.run(student.id, g.id);
            } catch (e: any) {
              if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                // Duplicate exists with correct ID -> Delete the corrupt one
                deleteStmt.run(g.id);
              }
            }
          } else {
             // If we can't resolve the student, we might want to keep it or delete it.
             // For now, leave it alone or delete? 
             // If we leave it, sync will keep failing. Better to delete if it's orphan?
             // But maybe student just hasn't synced yet. 
             // Let's assume sync should fix it eventually or next pull.
             // But if we leave it as text, push fails.
             // Use console.log for now.
             console.warn(`Could not resolve local ID for student server_id: ${g.student_id}`);
          }
        }
      }

      // 2. Repair Subject IDs
      const corruptSubjectGrades = this.db.prepare("SELECT id, subject_id FROM grades WHERE typeof(subject_id) = 'text'").all() as any[];
      if (corruptSubjectGrades.length > 0) {
        console.log(`Found ${corruptSubjectGrades.length} grades with corrupt subject_id`);
        const updateStmt = this.db.prepare("UPDATE grades SET subject_id = ? WHERE id = ?");
        const deleteStmt = this.db.prepare("DELETE FROM grades WHERE id = ?");

        for (const g of corruptSubjectGrades) {
          const subject = this.db.prepare("SELECT id FROM subjects WHERE server_id = ?").get(g.subject_id) as { id: number } | undefined;
          if (subject) {
            try {
              updateStmt.run(subject.id, g.id);
            } catch (e: any) {
               if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                deleteStmt.run(g.id);
              }
            }
          } else {
             console.warn(`Could not resolve local ID for subject server_id: ${g.subject_id}`);
          }
        }
      }
      
      // 3. Repair Note Academic Year IDs
      const activeYear = this.db.prepare("SELECT id FROM academic_years WHERE is_active = 1").get() as { id: number } | undefined;
      if (activeYear) {
        const result = this.db.prepare("UPDATE notes SET academic_year_id = ?, is_dirty = 1 WHERE academic_year_id IS NULL").run(activeYear.id);
        if (result.changes > 0) {
          console.log(`Repaired ${result.changes} notes with missing academic_year_id.`);
        }
      }
      
      console.log("Database repair: Check completed.");
    } catch (e) {
      console.error("Database repair failed (critical):", e);
    }
  }
}

export const syncService = new SyncService();
