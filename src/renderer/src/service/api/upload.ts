import request from '../request'

const module = 'upload/'

// 上传单个文件
export function uploadFile(data?: any, showLoading: boolean = false, showMsg: boolean = false) {
  return request<any>({
    method: 'post',
    url: `${module}`,
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    showLoading,
    showMsg
  })
}
