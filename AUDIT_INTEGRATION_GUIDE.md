# 审计日志集成示例

## 概述
本文档展示如何在各个 store 中集成审计日志功能，自动记录用户操作。

## 在 Store 中集成审计日志

### 1. 导入 auditStore

```typescript
import { useAuditStore } from './auditStore';
```

### 2. 在 CRUD 操作中记录日志

#### 创建操作示例（materialStore.ts）

```typescript
createMaterial: async (data: MaterialFormData) => {
  set({ loading: true, error: null });

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      set({ loading: false, error: '用户未登录' });
      return null;
    }

    const { data: newMaterial, error } = await supabase
      .from('materials')
      .insert([
        {
          ...data,
          current_stock: 0,
          created_by: userId,
          updated_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 记录审计日志
    useAuditStore.getState().logAction(
      'create',
      'material',
      newMaterial?.id,
      data.name,
      { code: data.code, specification: data.specification }
    );

    await get().fetchMaterials({ page: get().currentPage });
    set({ loading: false });
    return (newMaterial as Material) || null;
  } catch (err) {
    const appError = errorHandler.handle(err, '创建物料失败');
    reportError(err, 'material.createMaterial', { data });
    set({ error: errorHandler.getUserMessage(appError), loading: false });
    return null;
  }
},
```

#### 更新操作示例

```typescript
updateMaterial: async (id: string, data: Partial<MaterialFormData>) => {
  set({ loading: true, error: null });

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      set({ loading: false, error: '用户未登录' });
      return null;
    }

    const originalMaterial = get().getMaterialById(id);

    const { data: updatedMaterial, error } = await supabase
      .from('materials')
      .update({
        ...data,
        updated_by: userId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 记录审计日志 - 包含更改前后的数据
    useAuditStore.getState().logAction(
      'update',
      'material',
      id,
      originalMaterial?.name || data.name,
      {
        before: originalMaterial,
        after: data,
        changes: Object.keys(data)
      }
    );

    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...(updatedMaterial as Material) } : m
      ),
      loading: false,
    }));

    return (updatedMaterial as Material) || null;
  } catch (err) {
    const appError = errorHandler.handle(err, '更新物料失败');
    reportError(err, 'material.updateMaterial', { id, data });
    set({ error: errorHandler.getUserMessage(appError), loading: false });
    return null;
  }
},
```

#### 删除操作示例

```typescript
deleteMaterial: async (id: string) => {
  set({ loading: true, error: null });

  try {
    const material = get().getMaterialById(id);

    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) throw error;

    // 记录审计日志
    useAuditStore.getState().logAction(
      'delete',
      'material',
      id,
      material?.name,
      { code: material?.code, specification: material?.specification }
    );

    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
      loading: false,
    }));

    return true;
  } catch (err) {
    const appError = errorHandler.handle(err, '删除物料失败');
    reportError(err, 'material.deleteMaterial', { id });
    set({ error: errorHandler.getUserMessage(appError), loading: false });
    return false;
  }
},
```

### 3. 在 authStore 中记录登录/登出

#### 登录操作

```typescript
signIn: async (email: string, password: string): Promise<boolean> => {
  set({ loading: true, error: null });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const user = data?.user ?? null;

    if (error || !user) {
      const message = error?.message || '登录失败，请检查邮箱和密码';
      reportError(error ?? new Error(message), 'auth.signIn', { email });
      set({ user: null, loading: false, error: message });
      return false;
    }

    set({ user: toAppUser(user, email), loading: false, error: null });

    // 记录审计日志
    useAuditStore.getState().logAction(
      'login',
      'auth',
      user.id,
      email,
      { email }
    );

    return true;
  } catch (err) {
    const appError = errorHandler.handle(err, '登录失败');
    reportError(err, 'auth.signIn', { email });
    set({ user: null, loading: false, error: errorHandler.getUserMessage(appError) });
    return false;
  }
},
```

#### 登出操作

```typescript
signOut: async (): Promise<void> => {
  set({ loading: true, error: null });

  try {
    const user = get().user;

    const { error } = await supabase.auth.signOut();
    if (error) {
      reportError(error, 'auth.signOut');
    }

    // 记录审计日志
    if (user) {
      useAuditStore.getState().logAction(
        'logout',
        'auth',
        user.id,
        user.email,
        { email: user.email }
      );
    }
  } finally {
    set({ user: null, loading: false });
  }
},
```

## 最佳实践

### 1. 日志详情内容建议

- **创建操作**: 记录关键字段（代码、名称等）
- **更新操作**: 记录更改前后的数据，或至少记录更改的字段列表
- **删除操作**: 记录被删除对象的关键信息
- **登录/登出**: 记录邮箱、用户名等身份信息

### 2. 错误处理

审计日志记录不应阻塞主操作：

```typescript
try {
  // 主要业务逻辑
  const result = await performMainOperation();

  // 记录审计日志（异步，不阻塞）
  useAuditStore.getState().logAction(...);

  return result;
} catch (err) {
  // 主操作失败处理
  // 不记录审计日志
}
```

### 3. 离线支持

auditStore 已经实现了离线支持：
- 在线时保存到 Supabase
- 离线时保存到本地 localStorage
- 自动处理在线/离线切换

### 4. IP 地址获取

auditStore 会尝试获取用户 IP 地址，但有 1 秒超时：
- 获取成功则记录
- 获取失败不影响日志记录

## 集成清单

将审计日志集成到以下模块：

- [x] 类型定义（database.ts）
- [x] 本地数据库支持（localdb.ts）
- [x] 审计日志 Store（auditStore.ts）
- [x] 审计日志列表组件（AuditLogList.tsx）
- [x] 审计日志页面（AuditLogs.tsx）
- [x] 路由配置（App.tsx）
- [x] 导航菜单（Layout.tsx）
- [ ] 物料操作审计（materialStore.ts）
- [ ] 供应商操作审计（supplierStore.ts）
- [ ] 批次操作审计（batchStore.ts）
- [ ] 用户操作审计（authStore.ts - 登录/登出）
- [ ] 设置操作审计（settingsStore.ts）

## 权限控制

审计日志页面仅限以下角色访问：
- admin（管理员）
- manager（经理）

权限定义：`read_audit_logs`
