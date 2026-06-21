const router = require('express').Router();
const ctrl = require('../controllers/modifierController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags: [{ name: Modifier, description: Varian/modifier produk (ukuran, topping, dll) }]
 */
router.get('/groups', ctrl.listGroups);
router.post('/groups', validate(v.modifier.group), ctrl.createGroup);
router.put('/groups/:id', validate(v.modifier.group), ctrl.updateGroup);
router.delete('/groups/:id', ctrl.removeGroup);

router.post('/groups/:id/options', validate(v.modifier.option), ctrl.addOption);
router.put('/options/:id', validate(v.modifier.option), ctrl.updateOption);
router.delete('/options/:id', ctrl.removeOption);

router.get('/produk/:id', ctrl.getForProduct);
router.put('/produk/:id', validate(v.modifier.setProduct), ctrl.setProductGroups);

module.exports = router;
