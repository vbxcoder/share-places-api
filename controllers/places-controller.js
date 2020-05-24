const fs = require("fs");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let identifiedPlace;
  try {
    identifiedPlace = await Place.findById(placeId);
  } catch (error) {
    return next(
      new HttpError(
        "DB operation has failed. Could not find place. Error: " + error,
        500
      )
    );
  }

  // Unreachable Code
  if (!identifiedPlace) {
    return next(HttpError("Could not find a place for the provided id.", 400));
    // return res
    //   .status(404)
    //   .json({ message: "Could not find a place for the provided id." });
  }

  res.json({ place: identifiedPlace.toObject({ getters: true }) }); // maybe with that {}
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  //const userPlaces = DUMMY_PLACES.filter(p => p.creator === userId);

  //let userPlaces;
  let userWithPlaces;
  try {
    //userPlaces = await Place.find({ creator: userId });
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (error) {
    return next(
      new HttpError(
        "DB operation has failed. Could not find place. Error: " + error,
        500
      )
    );
  }

  if (!userWithPlaces || userWithPlaces.places.length < 1) {
    return next(
      new HttpError("Could not find any place for the provided user id.", 404)
    );
  }

  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  }); // maybe with that {}
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  if (!user) {
    return next(
      new HttpError("Could not find user for the provided user id.", 422)
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(new HttpError("DB operation has failed. Error: " + error, 500));
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let updatedPlace;
  try {
    updatedPlace = await Place.findById(placeId);
  } catch (error) {
    return next(
      new HttpError(
        "DB operation has failed. Could not find place. Error: " + error,
        500
      )
    );
  }

  if (!updatedPlace) {
    return next(
      new HttpError("Could not find a place for the provided id.", 400)
    );
  }

  if (updatedPlace.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this place", 401));
  }

  try {
    updatedPlace.title = title;
    updatedPlace.description = description;

    await updatedPlace.save();
  } catch (error) {
    return next(
      new HttpError(
        "DB operation has failed. Could not find place. Error: " + error,
        500
      )
    );
  }

  res.status(200).json({ place: updatedPlace.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  // DUMMY_PLACES should be <let>
  // DUMMY_PLACES = DUMMY_PLACES.filter(p => p.id !== placeId);

  let identifiedPlace;
  try {
    identifiedPlace = await Place.findById(placeId).populate("creator");
  } catch (error) {
    return next(
      new HttpError(
        "DB operation has failed. Could not delete place. Error: " + error,
        500
      )
    );
  }

  if (!identifiedPlace) {
    return next(new HttpError("Could not find place for this id.", 404));
  }

  if (identifiedPlace.creator.id !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this place", 403));
  }

  const imagePath = identifiedPlace.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await identifiedPlace.remove({ session: sess });
    identifiedPlace.creator.places.pull(identifiedPlace);
    await identifiedPlace.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    return next(
      new HttpError(
        "DB operation has failed. Could not delete place. Error: " + error,
        500
      )
    );
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Place deleted!..." });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
