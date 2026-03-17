package com.linecat.controlx.testutil;

import android.util.Log;

import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * Android Log 静态方法 Mock 工具类
 * 用于在单元测试中 mock android.util.Log 的静态方法
 */
public class AndroidLogMocker {

    private static MockedStatic<Log> mockedLog;

    /**
     * Mock android.util.Log 的静态方法
     * 在测试的 @Before 方法中调用
     */
    public static void mock() {
        if (mockedLog == null) {
            mockedLog = Mockito.mockStatic(Log.class);
            
            // Mock 所有 Log 方法返回默认值
            mockedLog.when(() -> Log.v(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            mockedLog.when(() -> Log.d(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            mockedLog.when(() -> Log.i(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            mockedLog.when(() -> Log.w(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            mockedLog.when(() -> Log.e(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            mockedLog.when(() -> Log.wtf(Mockito.anyString(), Mockito.anyString())).thenReturn(0);
            
            // Mock 带 Throwable 参数的方法
            mockedLog.when(() -> Log.v(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            mockedLog.when(() -> Log.d(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            mockedLog.when(() -> Log.i(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            mockedLog.when(() -> Log.w(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            mockedLog.when(() -> Log.e(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            mockedLog.when(() -> Log.wtf(Mockito.anyString(), Mockito.anyString(), Mockito.any(Throwable.class))).thenReturn(0);
            
            // Mock isLoggable 方法
            mockedLog.when(() -> Log.isLoggable(Mockito.anyString(), Mockito.anyInt())).thenReturn(true);
        }
    }

    /**
     * 释放 Mock 资源
     * 在测试的 @After 方法中调用
     */
    public static void unmock() {
        if (mockedLog != null) {
            mockedLog.close();
            mockedLog = null;
        }
    }

    /**
     * 检查当前是否处于 Mock 状态
     * @return 如果 Log 已被 mock 返回 true，否则返回 false
     */
    public static boolean isMocked() {
        return mockedLog != null;
    }
}