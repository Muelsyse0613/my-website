'use server';

import { createClient } from '@supabase/supabase-js';

// 初始化连接：因为这段代码只在服务器运行，所以极其安全
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 暗箱操作 1：根据名字查问题
export async function fetchQuestions(name: string) {
  const { data, error } = await supabase
    .from('vip_files')
    // ⚠️ 核心防御：只拿 id 和 问题！绝对不把 a1, a2, a3 和正文拉出来！
    .select('id, name, q1, q2, q3') 
    .eq('name', name)
    .single();

  if (error || !data) {
    return { success: false };
  }
  
  return { success: true, vipData: data };
}

// 暗箱操作 2：核对答案并下发文章
export async function verifyAndDecrypt(id: string, a1: string, a2: string, a3: string) {
  // 在服务器内部，把完整数据拉出来进行比对
  const { data, error } = await supabase
    .from('vip_files')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return { success: false, message: '系统出错' };

  // 严格比对答案（去除前后空格）
  if (
    data.a1.trim() === a1.trim() &&
    data.a2.trim() === a2.trim() &&
    data.a3.trim() === a3.trim()
  ) {
    // 答案全对，下发最终的解密文章！
    return { 
      success: true, 
      article: {
        title: data.title,
        date: data.date,
        summary: data.summary,
        content: data.content
      }
    };
  } else {
    // 答案错了，只返回冷酷的拒绝
    return { success: false, message: '记忆似乎出现了偏差，再好好想想？' };
  }
}