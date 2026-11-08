import { create } from 'zustand';
import { useGLTF } from '@react-three/drei';
import { CAR_CATALOG, DEFAULT_CAR_ID } from '../config/cars';

const defaultCar = CAR_CATALOG.find((c) => c.id === DEFAULT_CAR_ID) || CAR_CATALOG[0];

export const useGameStore = create((set, get) => ({
  // Active Car Selection
  cars: [...CAR_CATALOG],
  currentCarId: defaultCar.id,
  carModelPath: defaultCar.modelPath,
  carName: defaultCar.name,
  carTuning: defaultCar.tuning,

  // Car Telemetry
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
  carPosition: [-3.0, 0.3, 10.0],
  carRotation: 0, // Facing boulevard +Z

  // Game Settings & Camera (3 Dedicated Angles: Close, Far, Aerial)
  cameraMode: 'close',
  timeOfDay: 'sunset',
  soundEnabled: true,
  
  // Racing & Checkpoints
  gameMode: 'freeroam',
  raceActive: false,
  lapTime: 0,
  bestLapTime: null,
  currentCheckpoint: 0,
  totalCheckpoints: 8,
  raceFinished: false,

  // Reset Signal
  resetSignal: 0,

  // Fast Travel & District Teleport
  teleportSignal: 0,
  teleportTarget: null,
  teleportTo: (pos, rotY = 0) => set((s) => ({
    teleportSignal: s.teleportSignal + 1,
    teleportTarget: { pos, rotY }
  })),

  // Actions
  selectCar: (carId, resetToSpawn = false) => {
    const { cars, currentCarId, carModelPath } = get();
    if (carId === currentCarId) return;
    const car = cars.find((c) => c.id === carId);
    if (car) {
      const oldModelPath = carModelPath;
      set({
        currentCarId: car.id,
        carModelPath: car.modelPath,
        carName: car.name,
        carTuning: car.tuning || defaultCar.tuning,
        speed: 0,
        rpm: 900
      });
      // Purge old car from Drei cache so low RAM devices immediately release VRAM
      if (oldModelPath && oldModelPath !== car.modelPath) {
        try {
          useGLTF.clear(oldModelPath);
        } catch (e) {
          // Graceful fallback
        }
      }
      if (resetToSpawn) {
        get().triggerReset();
      }
    }
  },

  // Auto-scan / Sync cars from public/cars-models/
  syncCarsList: (newCarList) => {
    if (!Array.isArray(newCarList) || newCarList.length === 0) return;
    const { currentCarId } = get();

    const currentExists = newCarList.some((c) => c.id === currentCarId);
    const activeCar = currentExists
      ? newCarList.find((c) => c.id === currentCarId)
      : newCarList[0];

    set({
      cars: newCarList,
      currentCarId: activeCar.id,
      carModelPath: activeCar.modelPath,
      carName: activeCar.name,
      carTuning: activeCar.tuning || defaultCar.tuning
    });
  },

  fetchCars: async () => {
    // In dev mode, use HMR API; in production, use static cars-manifest.json directly
    if (import.meta.env.DEV) {
      try {
        const res = await fetch('/api/cars', { cache: 'no-cache' });
        if (res.ok) {
          const carList = await res.json();
          if (Array.isArray(carList) && carList.length > 0) {
            get().syncCarsList(carList);
            return;
          }
        }
      } catch (e) {
        // Fallback to manifest
      }
    }

    try {
      const resManifest = await fetch('/cars-manifest.json', { cache: 'no-cache' });
      if (resManifest.ok) {
        const carList = await resManifest.json();
        if (Array.isArray(carList) && carList.length > 0) {
          get().syncCarsList(carList);
        }
      }
    } catch (e) {
      console.warn('Could not fetch cars manifest:', e);
    }
  },

  triggerReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),
  setNitro: (nitro) => set({ nitro }),
  setNitroActive: (isNitroActive) => set({ isNitroActive }),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  cycleCameraMode: () => {
    // 3 Clean Camera Angles: 1st Initial Close, 2nd Far, 3rd Aerial (Thoda Uper Se Thoda Dur)
    const modes = ['close', 'far', 'aerial'];
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
  addDriftScore: (points) => set((s) => ({
    driftScore: s.driftScore + points,
    totalDriftScore: s.totalDriftScore + points
  })),

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
    const s = get();
    if (s.raceActive) {
      s.lapTime += delta;
    }
  }
}));

if (typeof window !== 'undefined') {
  window.useGameStore = useGameStore;
}

