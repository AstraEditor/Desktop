
sudo apt-get install icnsutils

mkdir icon.iconset

for size in 16 32 48 64 128 256 512 1024; do
    ffmpeg -i icon.ico -vf "scale=${size}:${size}" "icon_${size}x${size}.png"
done

# 打包成 icns（png2icns 会选合适的尺寸）
png2icns icon.icns icon_16x16.png icon_32x32.png icon_48x48.png icon_128x128.png icon_256x256.png icon_512x512.png icon_1024x1024.png

# 清理临时文件
rm -f icon_*.png
