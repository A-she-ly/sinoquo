import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw'; // Import rehype-raw
import { supabase } from '../lib/supabase';

const ManualPage: React.FC = () => {
  const navigate = useNavigate();
  // We'll use hardcoded content for now instead of fetching from storage
  // to make it easier to edit in code.
  const content = `
# 欢迎使用 Sinoquo

请直接在搜索框里敲产品名称、型号、参数等。<br/>
例如：\`51 rod 21\`，这样直径为51mm，长度有21的钻杆就会出现。<br/>
如果搜不到，说明还没规划好数据，稍安勿躁。

<br/>
<br/>

### 供应商代码说明：
*   **001**：五环
*   **002**：黑金刚
*   **003**：贵钢

<br/>
<br/>

### 报价
点击产品进入详情页。<br/>
**成本**：系统自动帮你算好了，还贴心地标了“Read Only”，怕你手抖把成本改了。
<br/>
**报价**：系统默认给了参考报价，你可以输入你想卖的单价。
<br/>
如果你不小心把价格卖得比成本还低，系统会直接红字贴心提醒：“注意哦亲，已低于成本价哟”。
<br/>
USD汇率默认按 7.0 算。
<br/>
**Tips**：有些产品带了点“小抄”（Tip），比如重要的螺纹、布齿参数等。
<br/>

编辑好产品点右下角的 **“Quote Preview”** 就可以预览报价表了。

<br/>
<br/>

### 导出：
**PDF**：自带 Logo，文件名字按日期起好了。
**Excel**：也可以导出 Excel 格式，方便自己再修修补补。

<br/>
<br/>

### 写在最后
如果你搜不到产品，或者发现哪个功能“抽风”了，欢迎给 **Ashley** 反馈，她不一定会改。<br/>
祝大家开单愉快！ 🎉🎈🎈
  `;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-gray-500 hover:text-black mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Search
        </button>
        
        <article className="prose prose-slate max-w-none prose-headings:mb-2 prose-headings:mt-6 prose-p:my-2 prose-li:my-1 prose-ul:my-2">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
};

export default ManualPage;