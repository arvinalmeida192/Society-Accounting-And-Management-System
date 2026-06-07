import { create } from 'zustand';

export interface AppTab {
  id: string;
  title: string;
  route: string;
}

interface TabStore {
  tabs: AppTab[];
  activeTabId: string | null;
  explorerVisible: boolean;
  openTab: (tab: AppTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  toggleExplorer: () => void;
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [{ id: 'home', title: 'Home', route: '/app/home' }],
  activeTabId: 'home',
  explorerVisible: true,
  openTab: (tab) => {
    const existing = get().tabs.find((item) => item.id === tab.id);
    if (existing) {
      set({ activeTabId: tab.id });
      return;
    }
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },
  closeTab: (id) => {
    set((state) => {
      const tabs = state.tabs.filter((tab) => tab.id !== id);
      const activeTabId =
        state.activeTabId === id ? (tabs.at(-1)?.id ?? null) : state.activeTabId;
      return { tabs: tabs.length > 0 ? tabs : state.tabs, activeTabId };
    });
  },
  setActiveTab: (id) => set({ activeTabId: id }),
  toggleExplorer: () => set((state) => ({ explorerVisible: !state.explorerVisible })),
}));
