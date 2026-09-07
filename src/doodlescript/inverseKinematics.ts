export interface TwoBoneSolution {
  reachable: boolean;
  upper: number;
  joint: number;
  distance: number;
  error: number;
}

const radiansToDegrees = 180 / Math.PI;

/** Exact planar two-bone IK with an explicit unreachable result. */
export function solveTwoBone(targetX: number, targetY: number, upperLength = 22, lowerLength = 23): TwoBoneSolution {
  const distance = Math.hypot(targetX, targetY);
  const minimum = Math.abs(upperLength - lowerLength);
  const maximum = upperLength + lowerLength;
  if (!Number.isFinite(distance) || distance < minimum || distance > maximum) {
    return {
      reachable: false,
      upper: Math.atan2(targetY, targetX) * radiansToDegrees,
      joint: 0,
      distance,
      error: distance < minimum ? minimum - distance : distance - maximum
    };
  }
  const cosine = Math.min(1, Math.max(-1,
    (distance * distance - upperLength * upperLength - lowerLength * lowerLength) / (2 * upperLength * lowerLength)));
  const jointRadians = Math.acos(cosine);
  const upperRadians = Math.atan2(targetY, targetX)
    - Math.atan2(lowerLength * Math.sin(jointRadians), upperLength + lowerLength * Math.cos(jointRadians));
  return {
    reachable: true,
    upper: upperRadians * radiansToDegrees,
    joint: jointRadians * radiansToDegrees,
    distance,
    error: 0
  };
}

export function twoBoneEndpoint(upper: number, joint: number, upperLength = 22, lowerLength = 23) {
  const upperRadians = upper / radiansToDegrees;
  const lowerRadians = (upper + joint) / radiansToDegrees;
  return {
    x: upperLength * Math.cos(upperRadians) + lowerLength * Math.cos(lowerRadians),
    y: upperLength * Math.sin(upperRadians) + lowerLength * Math.sin(lowerRadians)
  };
}
