set -e
mkdir __config__
export XDG_CONFIG_HOME=${PWD}/__config__
export DIR=${PWD}
echo "--------------------------"
echo "Starting Build"
echo "Current user on host"
echo `whoami`
echo "Current user in container"
docker run node:20 whoami
cd tools/node
echo "--------------------------"
echo "Installing packages..."
docker compose run --rm node npm ci
echo "--------------------------"
echo "Cleaning ..."
docker compose run --rm node npm run clean
echo "--------------------------"
echo "Installing packages..."
docker compose run --rm node npm ci
# echo "--------------------------"
# echo "TRY THIS..."
# docker compose run --rm node npm init -y
echo "--------------------------"
echo "Installing bower packages..."
echo "CONFIG $XDG_CONFIG_HOME"
docker compose run --rm  -e XDG_CONFIG_HOME=${XDG_CONFIG_HOME} node npm run install-bower
echo "--------------------------"
echo "Copying npm packages..."
docker compose run --rm node npm run install-npm
echo "--------------------------"
echo "Removing source maps..."
docker compose run --rm node npm run remove-source-maps
echo "--------------------------"
echo "Preparing dist..."
docker compose run --rm node npm run install-dist
echo "Build Finished"
echo "--------------------------"
cd ../..
