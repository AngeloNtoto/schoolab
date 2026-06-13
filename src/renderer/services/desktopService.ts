import { Menu, MenuItem, Submenu } from '@tauri-apps/api/menu';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { listen } from '@tauri-apps/api/event';

export const desktopService = {
  async initMenu() {
    try {
      const fileMenu = await Submenu.new({
        text: 'Fichier',
        items: [
          await MenuItem.new({ text: 'Ouvrir les notes', id: 'open-notes' }),
          await MenuItem.new({ text: 'Quitter', id: 'quit' })
        ]
      });

      const editMenu = await Submenu.new({
        text: 'Édition',
        items: [
          await MenuItem.new({ text: 'Annuler', id: 'undo' }),
          await MenuItem.new({ text: 'Rétablir', id: 'redo' }),
          await MenuItem.new({ text: 'Couper', id: 'cut' }),
          await MenuItem.new({ text: 'Copier', id: 'copy' }),
          await MenuItem.new({ text: 'Coller', id: 'paste' })
        ]
      });

      const menu = await Menu.new({
        items: [fileMenu, editMenu]
      });

      await menu.setAsAppMenu();
    } catch (e) {
      console.warn('Failed to init native menu:', e);
    }
  },

  async initShortcuts() {
    try {
      await unregisterAll();
      // Example: Register global shortcut to open app
      await register('CommandOrControl+Shift+S', (shortcut: any) => {
        console.log(`Shortcut ${shortcut} triggered`);
      });
    } catch (e) {
      console.warn('Failed to init global shortcuts:', e);
    }
  },

  async initSingleInstance() {
    try {
      await listen('tauri://single-instance', (event) => {
        console.log('Another instance was opened with args:', event.payload);
        // The main window automatically focuses via the rust plugin
      });
    } catch (e) {
      console.warn('Failed to listen to single instance event:', e);
    }
  },

  async showNotification(title: string, body: string) {
    try {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
      if (permissionGranted) {
        sendNotification({ title, body });
      }
    } catch (e) {
      console.warn('Failed to show notification:', e);
    }
  },

  async initDesktopFeatures() {
    await this.initMenu();
    await this.initShortcuts();
    await this.initSingleInstance();
  }
};
