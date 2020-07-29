# [Bucket](https://datacentricdesign.org/tools/bucket)

A bucket of data, in the cloud.

![version](https://img.shields.io/badge/version-0.0.8-blue.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)
[![GitHub issues open](https://img.shields.io/github/issues/datacentricdesign/bucket.svg?maxAge=2592000)]()
[![GitHub issues closed](https://img.shields.io/github/issues-closed-raw/datacentricdesign/bucket.svg?maxAge=2592000)]()

![Docker Cloud Build Status (UI)](https://img.shields.io/docker/cloud/build/datacentricdesign/bucket-ui?label=docker%20build%20%28ui%29)
![Docker Cloud Build Status (API)](https://img.shields.io/docker/cloud/build/datacentricdesign/bucket-api?label=docker%20build%20%28api%29)

[Bucket page](https://datacentricdesign.org/tools/bucket)


# Developer 

To get started, install the angular cli

```bash
npm install -g @angular/cli
```

# Deployment


```sh
docker network create dcd-net
```

Add Ambassador's rules 

## Step 5: Making a new release

```
git checkout -b release-0.0.x develop
```

Bumb versions: in readme, in both package.json, in docker-compose.yml

```
cd bucket-ui
npm publish
cd bucket-api
npm publish
git commit -a -m "Bumped version number to 0.0.x"
git checkout master
git merge --no-ff release-0.0.x
git tag -a 0.0.x
git push --follow-tags
git checkout develop
git merge --no-ff release-0.0.x
git branch -d release-0.0.x
```


# Run in Production

If not existing, create Docker network dcd-net.

Run docker-compose up.

- It builds the frontend and serve it with NGinx
- It builds and serve the bucket api