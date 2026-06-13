import { Command, WorkbenchContext } from './workbenchTypes';

class CommandRegistry {
  private commands = new Map<string, Command<any>>();

  registerCommand<T>(command: Command<T>) {
    if (this.commands.has(command.id)) {
      console.warn(`[CommandRegistry] La commande ${command.id} est déjà enregistrée. Remplacement.`);
    }
    this.commands.set(command.id, command);
  }

  getCommand(id: string): Command<any> | undefined {
    return this.commands.get(id);
  }

  getAllCommands(): Command<any>[] {
    return Array.from(this.commands.values());
  }

  async executeCommand<T>(id: string, payload?: T, ctx?: WorkbenchContext): Promise<void> {
    const command = this.getCommand(id);
    if (!command) {
      console.error(`[CommandRegistry] Commande non trouvée : ${id}`);
      return;
    }

    if (command.when && ctx && !command.when(ctx)) {
      console.log(`[CommandRegistry] La commande ${id} ne peut pas s'exécuter dans le contexte actuel.`);
      return;
    }

    try {
      await command.run(payload, ctx);
    } catch (err) {
      console.error(`[CommandRegistry] Erreur lors de l'exécution de la commande ${id}:`, err);
    }
  }
}

export const commandRegistry = new CommandRegistry();

// Utilitaire pour enregistrer plusieurs commandes
export function registerCommands(cmds: Command<any>[]) {
  cmds.forEach(cmd => commandRegistry.registerCommand(cmd));
}
