import { create } from 'zustand';

export const useGameStore = create((set, get) => ({
  // Car telemetry
  speed: 0,
  rpm: 900,
  gear: '1',
  steerAngle: 0,
  isDrifting: false,
  driftScore: 0,
  totalDriftScore: 0,
  nitro: 100,
  isNitroActive: false,
  headlights: true,
  carPosition: [10, 0.4, -9],
  carRotation: 0, // Y rotation in radians

  // Game Settings & Modes
  cameraMode: 'chase', // 'chase' | 'action' | 'cockpit' | 'free'
  timeOfDay: 'sunset', // 'day' | 'sunset' | 'night'
  soundEnabled: true,
  graphicsQuality: 'high', // 'high' | 'medium' | 'low'
  
  // Custom Car Model configuration
  carColor: '#e62e00', // Racing Red
  carModelPath: null, // User can set custom GLB path e.g. '/cars-models/my_car.glb'
  carName: 'Z-GT Apex Hypercar',

  // Racing & Checkpoints
  gameMode: 'freeroam', // 'freeroam' | 'race'
  raceActive: false,
  lapTime: 0,
  bestLapTime: null,
  currentCheckpoint: 0,
  totalCheckpoints: 8,
  raceFinished: false,

  // Reset flag
  resetSignal: 0,

  // Actions
  setSpeed: (speed) => set({ speed }),
  setRPM: (rpm) => set({ rpm }),
  setGear: (gear) => set({ gear }),
  setDrifting: (isDrifting) => set({ isDrifting }),
  addDriftScore: (points) => set((s) => ({
    driftScore: s.driftScore + points,
    totalDriftScore: s.totalDriftScore + points
  })),
  clearDriftScore: () => set({ driftScore: 0 }),
  setNitro: (nitro) => set({ nitro }),
  setNitroActive: (isNitroActive) => set({ isNitroActive }),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),
  setCarPosition: (pos) => set({ carPosition: pos }),
  setCarRotation: (rot) => set({ carRotation: rot }),
  
  setCameraMode: (mode) => set({ cameraMode: mode }),
  cycleCameraMode: () => {
    const modes = ['chase', 'action', 'cockpit', 'free'];
    const curIdx = modes.indexOf(get().cameraMode);
    const nextIdx = (curIdx + 1) % modes.length;
    set({ cameraMode: modes[nextIdx] });
  },

  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  cycleTimeOfDay: () => {
    const times = ['day', 'sunset', 'night'];
    const curIdx = times.indexOf(get().timeOfDay);
    const nextIdx = (curIdx + 1) % times.length;
    set({ timeOfDay: times[nextIdx] });
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setCarColor: (carColor) => set({ carColor }),
  setCarModelPath: (path) => set({ carModelPath: path }),

  triggerReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),

  // Race Actions
  startRace: () => set({
    gameMode: 'race',
    raceActive: true,
    lapTime: 0,
    currentCheckpoint: 0,
    raceFinished: false
  }),
  stopRace: () => set({
    gameMode: 'freeroam',
    raceActive: false,
    raceFinished: false
  }),
  reachCheckpoint: (checkpointIdx) => {
    const { currentCheckpoint, totalCheckpoints, lapTime, bestLapTime } = get();
    if (checkpointIdx === currentCheckpoint) {
      if (currentCheckpoint + 1 >= totalCheckpoints) {
        // Finished race!
        const newBest = bestLapTime === null ? lapTime : Math.min(bestLapTime, lapTime);
        set({
          currentCheckpoint: totalCheckpoints,
          raceFinished: true,
          bestLapTime: newBest,
          raceActive: false
        });
      } else {
        set({ currentCheckpoint: currentCheckpoint + 1 });
      }
    }
  },
  updateLapTime: (delta) => {
    if (get().raceActive) {
      set((s) => ({ lapTime: s.lapTime + delta }));
    }
  }
}));

