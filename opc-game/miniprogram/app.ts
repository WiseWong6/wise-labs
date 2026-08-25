App<IAppOption>({
  globalData: {},
  onLaunch() {
    wx.hideShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
  },
})
