import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 markdown 文件
const markdownPath = path.join(__dirname, 'OPENCODE_ARCHITECTURE.md');
let markdown = fs.readFileSync(markdownPath, 'utf8');

// 简单的 markdown 转 HTML 函数
function markdownToHtml(md) {
  let html = md;

  // 处理代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 处理标题
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 处理粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 处理表格
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
  });

  // 处理水平线
  html = html.replace(/^---$/gm, '<hr>');

  // 处理无序列表
  html = html.replace(/^- (.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // 处理有序列表
  html = html.replace(/^\d+\. (.*)$/gm, '<oli>$1</oli>');
  html = html.replace(/(<oli>.*<\/oli>\n?)+/g, (match) => {
    let i = 1;
    return '<ol>' + match.replace(/<oli>(.*?)<\/oli>/g, () => `<li>${i++}. $1</li>`) + '</ol>';
  });

  // 处理链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // 处理段落
  html = html.replace(/^([^<].*)$/gm, '<p>$1</p>');

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 转换 markdown
const contentHtml = markdownToHtml(markdown);

// HTML 模板
const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenCode 项目完整架构分析文档</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.8;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 60px;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }

        h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 10px;
            color: #1a1a1a;
            border-bottom: 3px solid #4a90d9;
            padding-bottom: 15px;
        }

        h2 {
            font-size: 24px;
            font-weight: 600;
            margin-top: 40px;
            margin-bottom: 15px;
            color: #2c3e50;
            border-left: 4px solid #4a90d9;
            padding-left: 15px;
        }

        h3 {
            font-size: 18px;
            font-weight: 600;
            margin-top: 25px;
            margin-bottom: 10px;
            color: #34495e;
        }

        p {
            margin-bottom: 12px;
            text-align: justify;
        }

        code {
            font-family: 'JetBrains Mono', 'Consolas', 'Monaco', monospace;
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.9em;
            color: #e74c3c;
        }

        pre {
            background: #282c34;
            color: #abb2bf;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            border: 1px solid #e0e0e0;
        }

        pre code {
            background: transparent;
            color: inherit;
            padding: 0;
            color: #abb2bf;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }

        table th,
        table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }

        table th {
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }

        table tr:hover {
            background: #f8f9fa;
        }

        ul, ol {
            margin-left: 30px;
            margin-bottom: 15px;
        }

        li {
            margin-bottom: 8px;
        }

        hr {
            border: none;
            border-top: 1px solid #e0e0e0;
            margin: 30px 0;
        }

        a {
            color: #4a90d9;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        /* 打印样式 */
        @media print {
            body {
                background: white;
                padding: 0;
            }

            .container {
                box-shadow: none;
                padding: 0;
                max-width: 100%;
            }

            h2 {
                page-break-after: avoid;
            }

            pre {
                page-break-inside: avoid;
            }

            table {
                page-break-inside: avoid;
            }
        }

        .toc {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }

        .toc h3 {
            margin-top: 0;
            color: #2c3e50;
        }

        .toc ul {
            list-style: none;
            margin-left: 0;
        }

        .toc li {
            margin-bottom: 8px;
        }

        .toc a {
            color: #4a90d9;
            text-decoration: none;
        }

        .toc a:hover {
            text-decoration: underline;
        }

        .info-box {
            background: #e8f4fd;
            border-left: 4px solid #4a90d9;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        ${contentHtml}
    </div>
</body>
</html>`;

// 写入 HTML 文件
const htmlPath = path.join(__dirname, 'OPENCODE_ARCHITECTURE_PRINT.html');
fs.writeFileSync(htmlPath, htmlTemplate);

console.log('HTML 文件已创建:', htmlPath);
console.log('请在浏览器中打开此文件，然后使用打印功能保存为 PDF');
