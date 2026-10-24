import { cloudApi } from './cloudApi'
import { localApi } from './localApi'
import { isCloud } from './supabaseClient'

export const api = isCloud ? cloudApi : localApi
