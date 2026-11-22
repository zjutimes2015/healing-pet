/**
 * 治愈萌宠 - 核心数据模型
 * 纯逻辑，无引擎依赖，可单独测试
 */

/** 进化阶段 */
export enum PetStage {
  Puppy = 0,   // 幼犬
  Teen = 1,    // 成长期
  Adult = 2,   // 成年
}

/** 心情等级 */
export enum Mood {
  Sad = 0,
  Okay = 1,
  Happy = 2,
  Excited = 3,
}

export interface PetState {
  name: string;
  stage: PetStage;
  growth: number;      // 成长值，累积到阈值进化
  mood: number;        // 心情值 0-100
  energy: number;      // 精力（喂食消耗）
  stepsToday: number;  // 今日步数
  lastFedAt: number;   // 上次喂食时间戳
  lastUpdatedAt: number;
}

/** 进化阈值 */
export const STAGE_THRESHOLDS = [0, 300, 1000];

/** 每次互动增加的成长值 */
export const GROWTH_PER_FEED = 12;
export const GROWTH_PER_STEP_BONUS = 0.05;

/** 心情自然衰减：每小时衰减点数 */
export const MOOD_DECAY_PER_HOUR = 2;

export function createInitialPet(): PetState {
  return {
    name: '小柴',
    stage: PetStage.Puppy,
    growth: 0,
    mood: 70,
    energy: 60,
    stepsToday: 0,
    lastFedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 根据累计成长值计算阶段
 */
export function calcStage(growth: number): PetStage {
  if (growth >= STAGE_THRESHOLDS[2]) return PetStage.Adult;
  if (growth >= STAGE_THRESHOLDS[1]) return PetStage.Teen;
  return PetStage.Puppy;
}

/**
 * 距离下一阶段还差多少成长值，已满级返回 null
 */
export function growthToNext(growth: number): number | null {
  for (const t of STAGE_THRESHOLDS) {
    if (growth < t) return t - growth;
  }
  return null;
}

/**
 * 当前阶段进度 0-1
 */
export function stageProgress(growth: number): number {
  const stage = calcStage(growth);
  if (stage === PetStage.Adult) return 1;
  const cur = STAGE_THRESHOLDS[stage];
  const next = STAGE_THRESHOLDS[stage + 1];
  return Math.min(1, (growth - cur) / (next - cur));
}

/**
 * 心情值转等级
 */
export function calcMood(mood: number): Mood {
  if (mood >= 85) return Mood.Excited;
  if (mood >= 60) return Mood.Happy;
  if (mood >= 30) return Mood.Okay;
  return Mood.Sad;
}

/**
 * 同步今日步数：步数转化为成长值加成 + 心情
 * 核心设计：走路本身就能让宠物成长，不需要额外操作
 */
export function syncSteps(pet: PetState, steps: number): PetState {
  const prev = pet.stepsToday;
  const delta = Math.max(0, steps - prev);
  if (delta === 0) return pet;

  const growthGain = delta * GROWTH_PER_STEP_BONUS;
  const newGrowth = pet.growth + growthGain;
  const newStage = calcStage(newGrowth);

  return {
    ...pet,
    stepsToday: steps,
    growth: newGrowth,
    stage: newStage,
    mood: Math.min(100, pet.mood + Math.min(10, delta / 500)),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 喂食：消耗精力，增加成长值和心情
 */
export function feed(pet: PetState): PetState {
  if (pet.energy < 10) return pet; // 精力不足，无法进食

  const newGrowth = pet.growth + GROWTH_PER_FEED;
  return {
    ...pet,
    growth: newGrowth,
    stage: calcStage(newGrowth),
    energy: Math.max(0, pet.energy - 10),
    mood: Math.min(100, pet.mood + 8),
    lastFedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 抚摸：只加心情，不加成长
 */
export function pet_(pet: PetState): PetState {
  return {
    ...pet,
    mood: Math.min(100, pet.mood + 3),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 随时间衰减（离线也生效）
 * 心情和精力随时间下降，制造"回来看看"的理由
 */
export function decay(pet: PetState, now: number = Date.now()): PetState {
  const hours = Math.max(0, (now - pet.lastUpdatedAt) / (1000 * 60 * 60));
  if (hours < 0.1) return pet;
  return {
    ...pet,
    mood: Math.max(0, pet.mood - hours * MOOD_DECAY_PER_HOUR),
    energy: Math.min(100, pet.energy + hours * 5), // 精力随时间恢复
    lastUpdatedAt: now,
  };
}

/**
 * 判断宠物是否在进化瞬间（用于触发动画）
 */
export function didEvolve(before: PetStage, after: PetStage): boolean {
  return after > before;
}
