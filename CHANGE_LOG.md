
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Support video streaming WebRTC (commented out, work in progress)

## [0.1.4] - 2022-03-15

### Added

- Delete data with property
- Delete specific timestamp
- PropertyService test

## [0.1.4] - 2022-02-15

- small fixes

## [0.1.3] - 2021-08-26

### Fixed

- Policy management for shared properties

## [0.1.2] - 2021-08-26

### Added

- Support media video, image, audio in dimensions (as part of updatePropertyValue and new endpoint to download media)
- Properly handle token expiry time on MQTT, closing the connection when necessary
- Labels attribute on Dimension (array of string) and Icon attribute on PropertyType (string)

## [0.1.1] - 2021-06-07

### Added

- Support for EC keys

### Fixed

- Various bugs
