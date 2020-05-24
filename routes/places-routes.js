const express = require("express");
const { check } = require("express-validator");

const PlacesController = require("../controllers/places-controller");
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get("/:pid", PlacesController.getPlaceById);

router.get("/user/:uid", PlacesController.getPlacesByUserId);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single('image'),
  [
    check("title")
      .not()
      .isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address")
      .not()
      .isEmpty()
  ],
  PlacesController.createPlace
);

router.patch(
  "/:pid",
  [
    check("title")
      .not()
      .isEmpty(),
    check("description").isLength({ min: 5 })
  ],
  PlacesController.updatePlace
);

router.delete("/:pid", PlacesController.deletePlace);

module.exports = router;
