import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const establishmentId = formData.get('establishmentId') as string | null

    if (!file || !establishmentId) {
      return NextResponse.json({ error: 'الملف والمعرف مطلوبان' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. رفع الملف إلى Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(fileName, file)

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    // 2. الحصول على الرابط العام
    const { data: publicUrl } = supabaseAdmin.storage.from('logos').getPublicUrl(fileName)

    // 3. تحديث جدول المؤسسات
    const { error: updateError } = await supabaseAdmin
      .from('establishments')
      .update({ logo_url: publicUrl.publicUrl })
      .eq('id', establishmentId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, logoUrl: publicUrl.publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'حدث خطأ' }, { status: 500 })
  }
}