set -e
export DIR=${PWD}
echo "--------------------------"
echo "Starting Build"
cd tools/node
echo "--------------------------"
echo "Preparing dev..."
docker compose run --rm node npm run install-dev
echo "Build Finished"
echo "--------------------------"
cd ../..
