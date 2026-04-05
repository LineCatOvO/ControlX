# ControlX ProGuard Rules
# Generated: 2026-04-05

# ==================== 基本配置 ====================

# 保留调试信息
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# 保留注解
-keepattributes *Annotation*

# 保留泛型签名
-keepattributes Signature

# 保留异常信息
-keepattributes Exceptions

# ==================== Gson 库 ====================

# Gson 使用反射，需要保留序列化类
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Gson 序列化的数据类
-keep class com.linecat.controlx.** { *; }
-keepclassmembers class com.linecat.controlx.** {
    <fields>;
    <methods>;
}

# ==================== OkHttp 库 ====================

# OkHttp 平台类
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-keep class okio.** { *; }

# OkHttp 拦截器
-keep class * implements okhttp3.Interceptor { *; }

# ==================== WebSocket ====================

# WebSocket 连接相关
-keep class com.linecat.controlx.websocket.** { *; }
-keepclassmembers class com.linecat.controlx.websocket.** {
    <fields>;
    <methods>;
}

# ==================== Android 组件 ====================

# Activity 和 Fragment
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Fragment
-keep public class * extends androidx.fragment.app.Fragment

# Service
-keep public class * extends android.app.Service

# BroadcastReceiver
-keep public class * extends android.content.BroadcastReceiver

# View
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(***);
}

# ==================== 输入系统 ====================

# 输入状态模型
-keep class com.linecat.controlx.input.** { *; }
-keepclassmembers class com.linecat.controlx.input.** {
    <fields>;
    <methods>;
}

# 安全控制器
-keep class com.linecat.controlx.safety.** { *; }

# Profile 管理
-keep class com.linecat.controlx.profile.** { *; }

# ==================== 脚本系统 ====================

# JavaScript 引擎相关
-keep class com.linecat.controlx.script.** { *; }

# ==================== 优化配置 ====================

# 优化级别
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# 优化选项
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*,!code/simplification/cast

# ==================== 混淆配置 ====================

# 不混淆特定类
-keep class * {
    public protected *;
}

# 保留 native 方法
-keepclasseswithmembernames class * {
    native <methods>;
}

# 保留自定义 View 的构造方法
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# 保留枚举
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# 保留 Parcelable
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# 保留 Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}