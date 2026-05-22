const api = require('../../utils/api');
const nutrition = require('../../utils/nutrition');

function emptyMeal() {
  return {
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    items: []
  };
}

Page({
  data: {
    imagePath: '',
    scanning: false,
    saving: false,
    scanResult: null,
    editedMeal: emptyMeal(),
    mealTypes: nutrition.MEAL_TYPES,
    mealTypeIndex: 1,
    mealTypeLabel: nutrition.MEAL_TYPES[1].label,
    hasItems: false
  },

  onLoad: function() {
    const type = nutrition.mealTypeByTime();
    const index = nutrition.MEAL_TYPES.findIndex(function(item) {
      return item.value === type;
    });
    const finalIndex = index >= 0 ? index : 1;
    this.setData({
      mealTypeIndex: finalIndex,
      mealTypeLabel: nutrition.MEAL_TYPES[finalIndex].label
    });
  },

  chooseImage: function() {
    const page = this;

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: function(res) {
          const file = res.tempFiles && res.tempFiles[0];
          page.setSelectedImage(file ? file.tempFilePath : '');
        }
      });
      return;
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        page.setSelectedImage(res.tempFilePaths[0]);
      }
    });
  },

  setSelectedImage: function(path) {
    if (!path) return;
    this.setData({
      imagePath: path,
      scanning: false,
      scanResult: null,
      editedMeal: emptyMeal()
    });
  },

  readFileBase64: function(filePath) {
    return new Promise(function(resolve, reject) {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'base64',
        success: function(res) {
          resolve(res.data);
        },
        fail: function(err) {
          reject(new Error(err.errMsg || '读取图片失败'));
        }
      });
    });
  },

  compressImage: function(filePath, quality) {
    return new Promise(function(resolve) {
      if (!filePath || !wx.compressImage) {
        resolve(filePath);
        return;
      }

      wx.compressImage({
        src: filePath,
        quality: quality || 70,
        success: function(res) {
          resolve(res.tempFilePath || filePath);
        },
        fail: function() {
          resolve(filePath);
        }
      });
    });
  },

  scanMeal: function() {
    const page = this;

    if (!this.data.imagePath) {
      wx.showToast({ title: '先选择一张食物图片', icon: 'none' });
      return;
    }

    this.setData({ scanning: true });

    this.compressImage(this.data.imagePath, 72)
      .then(function(scanPath) {
        return page.readFileBase64(scanPath);
      })
      .then(function(base64) {
        return api.request({
          url: '/api/ai/scan',
          method: 'POST',
          data: { image: base64 },
          auth: false,
          timeout: 30000
        });
      })
      .then(function(data) {
        const result = nutrition.normalizeMealResult(data.result);
        page.setData({
          scanResult: result,
          editedMeal: Object.assign({}, result),
          hasItems: result.items && result.items.length > 0
        });
      })
      .catch(function(err) {
        wx.showToast({ title: err.message, icon: 'none' });
      })
      .finally(function() {
        page.setData({ scanning: false });
      });
  },

  onMealInput: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ ['editedMeal.' + field]: e.detail.value });
  },

  onTypeChange: function(e) {
    const index = Number(e.detail.value);
    this.setData({
      mealTypeIndex: index,
      mealTypeLabel: nutrition.MEAL_TYPES[index] ? nutrition.MEAL_TYPES[index].label : '午餐'
    });
  },

  createThumbnail: function(filePath) {
    const page = this;

    return new Promise(function(resolve) {
      if (!filePath) {
        resolve(null);
        return;
      }

      wx.getImageInfo({
        src: filePath,
        success: function(info) {
          const query = wx.createSelectorQuery().in(page);
          query.select('#thumbCanvas').fields({ node: true, size: true }).exec(function(res) {
            const canvasInfo = res && res[0];
            if (!canvasInfo || !canvasInfo.node) {
              resolve(null);
              return;
            }

            const canvas = canvasInfo.node;
            const size = 320;
            const ctx = canvas.getContext('2d');
            canvas.width = size;
            canvas.height = size;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);

            const img = canvas.createImage();
            img.onload = function() {
              const scale = Math.max(size / info.width, size / info.height);
              const width = info.width * scale;
              const height = info.height * scale;
              const x = (size - width) / 2;
              const y = (size - height) / 2;
              ctx.drawImage(img, x, y, width, height);

              wx.canvasToTempFilePath({
                canvas: canvas,
                fileType: 'jpg',
                quality: 0.62,
                destWidth: size,
                destHeight: size,
                success: function(tmp) {
                  page.readFileBase64(tmp.tempFilePath)
                    .then(function(base64) {
                      resolve('data:image/jpeg;base64,' + base64);
                    })
                    .catch(function() {
                      resolve(null);
                    });
                },
                fail: function() {
                  resolve(null);
                }
              }, page);
            };
            img.onerror = function() {
              resolve(null);
            };
            img.src = filePath;
          });
        },
        fail: function() {
          resolve(null);
        }
      });
    });
  },

  saveMeal: function() {
    const page = this;
    const meal = this.data.editedMeal || {};

    if (!api.isLoggedIn()) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      wx.switchTab({ url: '/pages/settings/settings' });
      return;
    }

    if (!meal.name || !Number(meal.calories)) {
      wx.showToast({ title: '请先确认名称和热量', icon: 'none' });
      return;
    }

    const type = nutrition.MEAL_TYPES[this.data.mealTypeIndex]
      ? nutrition.MEAL_TYPES[this.data.mealTypeIndex].value
      : nutrition.mealTypeByTime();

    this.setData({ saving: true });

    this.createThumbnail(this.data.imagePath)
      .then(function(thumbnail) {
        return api.request({
          url: '/api/meals',
          method: 'POST',
          data: {
            name: meal.name,
            calories: Number(meal.calories),
            protein: Number(meal.protein || 0),
            carbs: Number(meal.carbs || 0),
            fat: Number(meal.fat || 0),
            items: meal.items || [],
            image: thumbnail,
            type: type
          }
        });
      })
      .then(function() {
        wx.showToast({ title: '已保存', icon: 'success' });
        page.setData({
          imagePath: '',
          scanResult: null,
          editedMeal: emptyMeal(),
          hasItems: false,
          saving: false
        });
      })
      .catch(function(err) {
        page.setData({ saving: false });
        wx.showToast({ title: err.message, icon: 'none' });
      });
  }
});
