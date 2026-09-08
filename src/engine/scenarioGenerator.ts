import { TrackBiome, AICarState, InstanceSeedData } from '../types';

export const BIOMES: TrackBiome[] = [
  {
    id: 'neon_cyber',
    name: 'Neo-Tokyo Cyber Circuit',
    skyColor: 0x070b19,
    groundColor: 0x0a1128,
    trackColor: 0x1f2438,
    kerbColor1: 0x00ffff,
    kerbColor2: 0xff007f,
    fogColor: 0x0c1222,
    fogDensity: 0.008,
    lightIntensity: 1.2,
    ambientColor: 0x223355,
    theme: 'neon_cyber'
  },
  {
    id: 'sunset_canyon',
    name: 'Red Rock Sunset Canyon',
    skyColor: 0xff7b54,
    groundColor: 0x8b3a2b,
    trackColor: 0x2c2c2c,
    kerbColor1: 0xffd23f,
    kerbColor2: 0xee4266,
    fogColor: 0xd65a31,
    fogDensity: 0.005,
    lightIntensity: 1.5,
    ambientColor: 0x5a3d31,
    theme: 'sunset_canyon'
  },
  {
    id: 'alpine_snow',
    name: 'Alpine Summit Raceway',
    skyColor: 0xa0c4e2,
    groundColor: 0xeef2f7,
    trackColor: 0x333b48,
    kerbColor1: 0x3a86ff,
    kerbColor2: 0xf8f9fa,
    fogColor: 0xdbe4ee,
    fogDensity: 0.007,
    lightIntensity: 1.4,
    ambientColor: 0x4a5d6e,
    theme: 'alpine_snow'
  },
  {
    id: 'midnight_highway',
    name: 'Midnight Coastal Expressway',
    skyColor: 0x050711,
    groundColor: 0x090f1d,
    trackColor: 0x1a1a24,
    kerbColor1: 0xffaa00,
    kerbColor2: 0x222233,
    fogColor: 0x060a14,
    fogDensity: 0.009,
    lightIntensity: 0.9,
    ambientColor: 0x111c33,
    theme: 'midnight_highway'
  },
  {
    id: 'desert_oasis',
    name: 'Sahara Mirage GP',
    skyColor: 0xf3ca82,
    groundColor: 0xd4a373,
    trackColor: 0x3a332a,
    kerbColor1: 0xe76f51,
    kerbColor2: 0xf4a261,
    fogColor: 0xe9c46a,
    fogDensity: 0.006,
    lightIntensity: 1.6,
    ambientColor: 0x6e5033,
    theme: 'desert_oasis'
  }
];

const CAR_NAMES = [
  'Phantom Apex', 'Viper GT-R', 'Nebula RS', 'Zenith Turbo',
  'Titan V12', 'Spectre Evo', 'Ignis GT', 'Vortex Speedster',
  'Solaris Drift', 'Cobalt Mach', 'Aero Horizon', 'Nemesis Black'
];

const CAR_COLORS = [
  { name: 'Hyper Cyan', hex: 0x00f0ff, str: '#00f0ff' },
  { name: 'Crimson Red', hex: 0xff1744, str: '#ff1744' },
  { name: 'Electric Lime', hex: 0x76ff03, str: '#76ff03' },
  { name: 'Sunset Amber', hex: 0xff9100, str: '#ff9100' },
  { name: 'Deep Violet', hex: 0x7c4dff, str: '#7c4dff' },
  { name: 'Titanium White', hex: 0xf5f5f7, str: '#f5f5f7' },
  { name: 'Stealth Onyx', hex: 0x212121, str: '#212121' },
  { name: 'Solar Gold', hex: 0xffd600, str: '#ffd600' }
];

const CAR_TYPES: ('hypercar' | 'muscle' | 'formula' | 'gt_racer' | 'cyber_coupe')[] = [
  'hypercar', 'muscle', 'formula', 'gt_racer', 'cyber_coupe'
];

// Linear Congruential Generator for deterministic randomness from Seed
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

export class SeedManager {
  private usedSeeds: Set<number> = new Set();

  generateUniqueSeed(): number {
    let seed: number;
    let attempts = 0;
    do {
      seed = Math.floor(100000 + Math.random() * 900000);
      attempts++;
    } while (this.usedSeeds.has(seed) && attempts < 100);

    this.usedSeeds.add(seed);
    return seed;
  }

  createScenario(instanceId: number, forcedSeed?: number): InstanceSeedData {
    const seed = forcedSeed ?? this.generateUniqueSeed();
    const rng = new SeededRNG(seed + instanceId * 777);

    const biomeIndex = Math.floor(rng.range(0, BIOMES.length));
    const biome = BIOMES[biomeIndex];

    const weathers: ('Sunny' | 'Overcast' | 'Night' | 'Neon' | 'Sunset')[] = [
      'Sunny', 'Overcast', 'Night', 'Neon', 'Sunset'
    ];
    const weather = rng.choice(weathers);

    const carCount = Math.floor(rng.range(4, 7)); // 4 to 6 cars per race
    const cars: AICarState[] = [];

    const shuffledNames = [...CAR_NAMES].sort(() => rng.next() - 0.5);
    const shuffledColors = [...CAR_COLORS].sort(() => rng.next() - 0.5);

    for (let i = 0; i < carCount; i++) {
      const color = shuffledColors[i % shuffledColors.length];
      const name = shuffledNames[i % shuffledNames.length];
      const type = rng.choice(CAR_TYPES);
      const maxSpeed = rng.range(360, 460); // km/h (Hyper-speed)
      const acceleration = rng.range(18.0, 26.0);
      const aggression = rng.range(0.45, 0.98);

      // Grid start position
      const gridOffset = (i % 2 === 0 ? -0.4 : 0.4);
      const progress = Math.max(0, 0.05 - i * 0.015);

      cars.push({
        id: `car_${instanceId}_${i + 1}`,
        name,
        color: color.str,
        hexColor: color.hex,
        type,
        speed: 0,
        targetSpeed: maxSpeed,
        maxSpeed,
        acceleration,
        lap: 1,
        lapProgress: progress,
        lateralOffset: gridOffset,
        targetLateralOffset: gridOffset,
        steerAngle: 0,
        rank: i + 1,
        aggression,
        isDrifting: false,
        driftAngle: 0,
        collisionCooldown: 0,
        meshIndex: i
      });
    }

    return {
      seed,
      instanceId,
      biome,
      weather,
      carCount,
      cars,
      aiAggressionBase: rng.range(0.4, 0.8),
      createdAt: new Date().toISOString()
    };
  }
}

export const seedManager = new SeedManager();
