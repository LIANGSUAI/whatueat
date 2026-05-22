function dataUrlToFile(dataUrl, fileKey) {
  return new Promise(function(resolve) {
    const source = String(dataUrl || '');
    const match = source.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.*)$/);

    if (!match) {
      resolve(source);
      return;
    }

    const ext = match[1].replace('jpeg', 'jpg').split('+')[0] || 'jpg';
    const base64 = match[2];
    const safeKey = String(fileKey || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = wx.env.USER_DATA_PATH + '/whatueat_' + safeKey + '.' + ext;

    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: base64,
      encoding: 'base64',
      success: function() {
        resolve(filePath);
      },
      fail: function() {
        resolve('');
      }
    });
  });
}

function hydrateMealImages(meals) {
  const list = Array.isArray(meals) ? meals : [];
  return Promise.all(list.map(function(meal, index) {
    if (!meal || !meal.image) {
      return Promise.resolve(meal);
    }

    return dataUrlToFile(meal.image, meal.id || index)
      .then(function(imagePath) {
        return Object.assign({}, meal, {
          imagePath: imagePath || ''
        });
      });
  }));
}

module.exports = {
  dataUrlToFile: dataUrlToFile,
  hydrateMealImages: hydrateMealImages
};
