const { assertProFeature } = require('../utils/plan');

function requireProPlan(req, res, next) {
  assertProFeature().then(() => next()).catch(next);
}

module.exports = { requireProPlan };
