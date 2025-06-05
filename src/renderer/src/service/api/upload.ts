import request from '../request'

const module = 'upload/'

// 上传单个文件
export function uploadFile(data?: any, showLoading: boolean = true, showMsg: boolean = true) {
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
