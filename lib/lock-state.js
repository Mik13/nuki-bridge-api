/**
 * The possible lock states.
 *
 * @enum {Number}
 */
var LockState = {
  UNCALIBRATED: 0,
  LOCKED: 1,
  UNLOCKED: 2,
  UNLOCKED_LOCK_N_GO: 3,
  UNLATCHED: 4,
  LOCKING: 5,
  UNLOCKING: 6,
  UNLATCHING: 7,
  MOTOR_BLOCKED: 254,
  UNDEFINED: 255
};

module.exports = LockState;