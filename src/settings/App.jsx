import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
} from '@mui/material';
import { DEFAULT_CONFIG } from '../shared/constants.js';

export default function App() {
  const [form, setForm] = useState({ ...DEFAULT_CONFIG });
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [testResult, setTestResult] = useState(null); // 测试连接结果 { ok, message }
  const [autoStart, setAutoStart] = useState(false);

  // 启动时从主进程拉取已保存配置
  useEffect(() => {
    const api = window.api;
    if (api && api.getConfig) {
      api
        .getConfig()
        .then(async (cfg) => {
          if (cfg) setForm({ ...DEFAULT_CONFIG, ...cfg });
          if (api.getAutoStart) {
            const actual = await api.getAutoStart();
            setAutoStart(Boolean(actual));
          } else {
            setAutoStart(Boolean(cfg?.autoStart));
          }
        })
        .catch(() => {});
    }
  }, []);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      const res = await window.api.testConnection({
        baseUrl: form.baseUrl,
        token: form.token,
        userId: form.userId,
      });
      setTestResult(res);
    } catch (e) {
      setTestResult({
        ok: false,
        message: '测试失败：' + (e && e.message ? e.message : '未知错误'),
      });
    }
  };

  const handleAutoStart = async (event) => {
    const enabled = event.target.checked;
    try {
      const actual = await window.api.setAutoStart(enabled);
      setAutoStart(actual);
    } catch (e) {
      setErrorMsg('开机自启设置失败：' + (e?.message || '未知错误'));
    }
  };

  const handleSave = async () => {
    // 数值字段做类型转换与兜底，避免写入非法值
    const payload = {
      ...form,
      refreshInterval: Number(form.refreshInterval) || DEFAULT_CONFIG.refreshInterval,
      factor: DEFAULT_CONFIG.factor,
      currencySymbol: '',
    };
    try {
      await window.api.saveConfig(payload);
      setSaved(true);
      setErrorMsg('');
      // 主进程会发送 config-saved，这里兜底关闭窗口
      setTimeout(() => window.close(), 400);
    } catch (e) {
      // 明确暴露错误，避免“点击毫无反应”无从排查
      setErrorMsg('保存失败：' + (e && e.message ? e.message : '未知错误'));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        NewAPI 监控设置
      </Typography>

      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          label="中转站URL"
          placeholder="https://api.example.com"
          value={form.baseUrl}
          onChange={update('baseUrl')}
          fullWidth
        />
        <TextField
          label="访问令牌"
          type="password"
          value={form.token}
          onChange={update('token')}
          fullWidth
        />
        <TextField
          label="用户ID (New-Api-User)"
          placeholder="数字，factory.pub 等部署必需"
          value={form.userId}
          onChange={update('userId')}
          helperText="部分部署要求带数字用户ID头；留空兼容普通 NewAPI"
          fullWidth
        />
        <FormControlLabel
          control={<Switch checked={autoStart} onChange={handleAutoStart} />}
          label="开机自动启动"
        />
        <TextField
          label="更新频率(秒)"
          type="number"
          value={form.refreshInterval}
          onChange={update('refreshInterval')}
          inputProps={{ min: 10 }}
          fullWidth
        />

        <Stack direction="row" spacing={2}>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
          <Button variant="outlined" onClick={handleTest}>
            测试连接
          </Button>
        </Stack>

        {testResult && (
          <Alert severity={testResult.ok ? 'success' : 'error'}>
            {testResult.message}
          </Alert>
        )}
      </Stack>

      <Snackbar
        open={saved || !!errorMsg}
        autoHideDuration={2500}
        onClose={() => {
          setSaved(false);
          setErrorMsg('');
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={errorMsg ? 'error' : 'success'} sx={{ width: '100%' }}>
          {errorMsg ? errorMsg : '已保存'}
        </Alert>
      </Snackbar>
    </Box>
  );
}
