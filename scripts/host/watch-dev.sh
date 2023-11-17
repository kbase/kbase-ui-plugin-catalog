set -e
export DIR=${PWD}
echo "--------------------------"
echo "Starting Build"
cd tools/node
echo "--------------------------"
echo "Watching src and copying to dev..."
docker compose run --rm node npm run watch
echo "Watch done"
echo "--------------------------"
cd ../..
