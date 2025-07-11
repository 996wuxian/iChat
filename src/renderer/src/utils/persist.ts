/**
 * @description pinia持久化参数配置
 * @param {String} key 存储到持久化的 name
 * @param {Array} paths 需要持久化的 state name
 * @return persist
 * */
const piniaPersistConfig = (key: string, paths?: string[]) => {
  const persist = {
    key,
    storage: window.localStorage,
    pick: paths,
    deep: true
  }
  return persist
}

export default piniaPersistConfig
