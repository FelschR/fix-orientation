var Exif = require('@fengyuanchen/exif');
var rotate = require('rotate-component');
var resize = require('./lib/resize');
var size = {
  'image/png': require('png-size'),
  'image/jpeg': require('jpeg-size')
};

module.exports = fixOrientation;

async function fixOrientation (blob, opts) {
  console.log(new Date().toISOString() + ': fixing orientation...');
  if (typeof opts == 'function') {
    fn = opts;
    opts = {};
  }

  const exifData = await new Promise((resolve, reject) => {
    const exif = new Exif(blob, {
      done: (data) => {
        resolve(data);
      },
      fail: (err) => {
        console.info('EXIF parsing failed:\n' + err);
        resolve(undefined);
      }
    });
  });
  const orientation = exifData ? exifData.Orientation : undefined;

  var toRotate = orientation && (orientation == 6 || orientation == 8);

  if (!toRotate) {
    return blob;
  }

  var s = size[blob.type](buf);
  var max = Math.max(s.width, s.height);
  var half = max / 2;
  var dir = { 6: 1, 8: -1 }[orientation];

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = canvas.height = max;

  rotate(ctx, { x: half, y: half, degrees: dir * 90 });

  console.log(new Date().toISOString() + ': converting Blob to ImageBitmap...');
  const img = await createImageBitmap(blob);
  console.log(new Date().toISOString() + ': Bitmap conversion done; drawing image to canvas...');

  if (dir == 1) {
    ctx.drawImage(img, 0, max - s.height);
  } else {
    ctx.drawImage(img, max - s.width, 0);
  }

  console.log(new Date().toISOString() + ': Rotating canvas...');
  rotate(ctx, { x: half, y: half, degrees: -1 * dir * 90 });
  console.log(new Date().toISOString() + ': Resizing canvas...');
  resize(canvas, {
    width: s.height,
    height: s.width
  });

  console.log(new Date().toISOString() + ': Canvas to Blob...');
  const resultBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((resultBlob) => {
      resolve(resultBlob);
    }, blob.type);
  });
  console.log(new Date().toISOString() + ': rotation done! returning results...');
  return resultBlob;
}
