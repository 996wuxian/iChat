<template>
  <div
    ref="messageInputRef"
    class="message-input"
    contenteditable="true"
    placeholder="请输入消息..."
    @input="handleInput"
    @keydown.enter.prevent="handleEnterKey"
    @paste="handlePaste"
  ></div>
</template>

<script setup lang="ts">
import { $msg } from '@renderer/config/interaction.config'
import { useHomeStore } from '../store/index'
import { uploadFile } from '@renderer/service/api/upload'
const { messageInputRef, messageContent, handleSendMessage } = useHomeStore()

const handleInput = () => {
  if (messageInputRef.value) {
    messageContent.value = messageInputRef.value.innerHTML
  }
}

// 处理回车键发送消息
const handleEnterKey = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    handleSendMessage()
  }
}

// 处理粘贴事件，清除不需要的样式
const handlePaste = async (e: ClipboardEvent) => {
  // 阻止默认粘贴行为
  e.preventDefault()

  // 检查剪贴板是否包含图片
  const items = e.clipboardData?.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 如果是图片类型
      if (item.type.indexOf('image') !== -1) {
        // 获取图片文件
        const file = item.getAsFile()
        if (file) {
          try {
            // 上传图片
            const formData = new FormData()
            formData.append('file', file)
            const res = await uploadFile(formData, false, false)

            if (res.code === 200) {
              // 创建图片元素并插入到输入框
              const img = document.createElement('img')
              img.src = res.data.url
              img.className = 'w-100px h-100px inline-block'
              img.dataset.type = 'image'

              if (messageInputRef.value) {
                messageInputRef.value.appendChild(img)
                // 更新消息内容
                messageContent.value = messageInputRef.value.innerHTML
              }
            }
          } catch (error) {
            console.error('图片处理失败:', error)
            $msg({
              type: 'error',
              msg: '图片处理失败'
            })
          }
          return
        }
      }
    }
  }

  // 获取HTML内容
  const html = e.clipboardData?.getData('text/html') || ''

  // 如果有HTML内容，则处理HTML
  if (html) {
    // 创建临时div解析内容
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html.trim() // 先对整体内容进行trim

    const removeComments = (node: Node) => {
      const childNodes = Array.from(node.childNodes)
      childNodes.forEach((child) => {
        if (child.nodeType === Node.COMMENT_NODE) {
          node.removeChild(child)
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          removeComments(child)
        }
      })
    }
    removeComments(tempDiv)

    // 处理所有图片元素
    const images = tempDiv.querySelectorAll('img')
    images.forEach((img) => {
      // 保留必要的属性
      const newImg = document.createElement('img')
      newImg.src = img.src
      newImg.alt = img.src.split('/').pop() || ''

      // 设置表情样式
      if (img.src.includes('/emoji/')) {
        newImg.className = 'w-20px h-20px inline-block'
        newImg.dataset.type = 'emoji'
      } else {
        newImg.className = 'w-100px h-100px inline-block'
        newImg.dataset.type = 'image'
      }

      // 替换原始图片
      img.parentNode?.replaceChild(newImg, img)
    })

    // 提取纯文本内容
    const spans = tempDiv.querySelectorAll('span')
    spans.forEach((span) => {
      if (span.textContent?.trim()) {
        const textNode = document.createTextNode(span.textContent.trim())
        span.parentNode?.replaceChild(textNode, span)
      }
    })

    // 移除所有多余的div和属性，同时处理空行
    const divs = tempDiv.querySelectorAll('div')
    divs.forEach((div) => {
      const parent = div.parentNode
      // 如果div内容为空或只包含空白字符，直接移除
      if (!div.textContent?.trim() && !div.querySelector('img')) {
        parent?.removeChild(div)
        return
      }
      // 处理有内容的div
      while (div.firstChild) {
        parent?.insertBefore(div.firstChild, div)
      }
      parent?.removeChild(div)
    })

    // 将处理后的内容插入到当前光标位置，移除首尾空白字符
    const cleanedHtml = tempDiv.innerHTML.trim()
    document.execCommand('insertHTML', false, cleanedHtml)
  } else {
    // 如果只有纯文本，直接插入（移除首尾空白字符）
    const text = (e.clipboardData?.getData('text/plain') || '').trim()
    document.execCommand('insertText', false, text)
  }

  // 更新消息内容
  if (messageInputRef.value) {
    messageContent.value = messageInputRef.value.innerHTML
  }
}
</script>

<style lang="scss" scoped>
.message-input {
  flex: 1;
  border: none;
  resize: none;
  outline: none;
  font-size: 14px;
  font-family: '微软雅黑';
  min-height: 60px;
  line-height: 1.5;
  flex-wrap: wrap;
  width: 100%;
  white-space: pre-wrap; /* 保留空格和换行符 */
  word-wrap: break-word; /* 允许长单词换行 */
  word-break: break-all; /* 允许在任意字符间换行 */
  overflow-wrap: break-word; /* 防止溢出 */
  overflow: auto;

  &:focus {
    border-color: var(--theme-color);
  }

  img {
    vertical-align: middle;
    margin: 0 2px;
  }
}
</style>
