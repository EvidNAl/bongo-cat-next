import { create } from "zustand";

export type PetInteractionCommand = "pet" | "feed" | "play" | "toggle_follow";

interface PetInteractionState {
  followEnabled: boolean;
  lastCommand: PetInteractionCommand | null;
  commandVersion: number;
  setFollowEnabled: (value: boolean) => void;
  issueCommand: (command: PetInteractionCommand) => void;
}

export const usePetInteractionStore = create<PetInteractionState>((set) => ({
  followEnabled: false,
  lastCommand: null,
  commandVersion: 0,
  setFollowEnabled: (followEnabled) => {
    set({ followEnabled });
  },
  issueCommand: (lastCommand) => {
    set((state) => ({
      lastCommand,
      commandVersion: state.commandVersion + 1
    }));
  }
}));
