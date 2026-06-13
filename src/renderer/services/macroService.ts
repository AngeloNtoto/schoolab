export interface MacroAction {
  commandId: string;
  payload?: any;
}

export interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
}

class MacroService {
  private macros: Macro[] = [];
  private isRecording = false;
  private currentRecording: MacroAction[] = [];
  private executeCommandFn: ((id: string, payload?: any) => Promise<void>) | null = null;

  setExecuteCommandFn(fn: (id: string, payload?: any) => Promise<void>) {
    this.executeCommandFn = fn;
  }

  startRecording() {
    this.isRecording = true;
    this.currentRecording = [];
    window.dispatchEvent(new Event('macro:recordingStart'));
  }

  stopRecording(name: string, description?: string): Macro {
    this.isRecording = false;
    const macro: Macro = {
      id: `macro-${Date.now()}`,
      name,
      description,
      actions: [...this.currentRecording]
    };
    this.macros.push(macro);
    this.saveMacros();
    window.dispatchEvent(new Event('macro:recordingStop'));
    return macro;
  }

  cancelRecording() {
    this.isRecording = false;
    this.currentRecording = [];
    window.dispatchEvent(new Event('macro:recordingStop'));
  }

  recordAction(commandId: string, payload?: any) {
    if (!this.isRecording) return;
    this.currentRecording.push({ commandId, payload });
  }

  async playMacro(macroId: string) {
    if (!this.executeCommandFn) throw new Error("executeCommand not set");
    
    const macro = this.macros.find(m => m.id === macroId);
    if (!macro) throw new Error("Macro not found");

    for (const action of macro.actions) {
      await this.executeCommandFn(action.commandId, action.payload);
      // Small delay between actions for visual feedback and state stabilization
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  getMacros(): Macro[] {
    return this.macros;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  deleteMacro(id: string) {
    this.macros = this.macros.filter(m => m.id !== id);
    this.saveMacros();
  }

  private saveMacros() {
    localStorage.setItem('schoolab_macros', JSON.stringify(this.macros));
  }

  loadMacros() {
    try {
      const stored = localStorage.getItem('schoolab_macros');
      if (stored) {
        this.macros = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load macros", e);
    }
  }
}

export const macroService = new MacroService();
macroService.loadMacros();
