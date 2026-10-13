const stages={renderer:'图形初始化',textures:'素材加载',catalogs:'观测目录',scene:'场景构建',detail:'高清素材',compile:'渲染准备'};

export function startupFailureMessage(error,stage='scene'){
  if(error?.name==='VoyagerResourceError'){
    return error.code==='RESOURCE_AUTHENTICATION_FAILED'
      ?'素材校验失败，可能读取了旧缓存或不完整的数据。请重新加载页面后再输入密码；不要调整显卡设置。'
      :'素材下载未完成。请检查网络连接后重新加载页面；离线使用时请确认下载了完整文件。';
  }
  if(error?.name==='OperationError'&&['textures','catalogs','detail'].includes(stage)){
    return '加密素材未能正常解锁。请重新加载页面后再输入密码；若仍失败，请报告此提示。';
  }
  const message=String(error?.message||error||'未知错误');
  if(stage==='renderer'||/WebGL|rendering context|渲染上下文/i.test(message)){
    return message+'。请使用支持 WebGL 2 的新版浏览器，并确认硬件加速已开启。';
  }
  return `启动未完成（${stages[stage]||'场景初始化'}）：${message}。请重新加载；若仍失败，请报告此提示。`;
}
