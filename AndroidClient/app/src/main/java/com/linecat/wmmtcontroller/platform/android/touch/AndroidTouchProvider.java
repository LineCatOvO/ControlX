package com.linecat.wmmtcontroller.platform.android.touch;

import android.content.Context;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.View.OnTouchListener;

import com.linecat.wmmtcontroller.platform.api.ITouchProvider;

import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Android 触摸提供者实现
 * 
 * 职责：提供 Android 平台触摸事件数据
 */
public class AndroidTouchProvider implements ITouchProvider, OnTouchListener {
    
    private static final String TAG = "AndroidTouchProvider";
    
    private final Context context;
    private TouchListener touchListener;
    
    /**
     * 构造函数
     * @param context Android 上下文
     */
    public AndroidTouchProvider(Context context) {
        this.context = context.getApplicationContext();
    }
    
    @Override
    public void setTouchListener(TouchListener listener) {
        this.touchListener = listener;
        Log.d(TAG, "Touch listener set");
    }
    
    @Override
    public void clearTouchListener() {
        this.touchListener = null;
        Log.d(TAG, "Touch listener cleared");
    }
    
    /**
     * 绑定到视图以接收触摸事件
     * @param view 要绑定的视图
     */
    public void bindToView(View view) {
        if (view != null) {
            view.setOnTouchListener(this);
            Log.d(TAG, "Bound to view: " + view);
        } else {
            Log.w(TAG, "Attempted to bind to null view");
        }
    }
    
    @Override
    public boolean onTouch(View v, MotionEvent event) {
        if (touchListener == null) {
            return false;
        }
        
        int action = event.getActionMasked();
        int pointerIndex = event.getActionIndex();
        int pointerId = event.getPointerId(pointerIndex);
        float x = event.getX(pointerIndex);
        float y = event.getY(pointerIndex);
        long timestampNs = event.getEventTime() * 1000000; // 转换为纳秒
        
        switch (action) {
            case MotionEvent.ACTION_DOWN:
            case MotionEvent.ACTION_POINTER_DOWN:
                touchListener.onPointerDown(pointerId, x, y, timestampNs);
                break;
                
            case MotionEvent.ACTION_MOVE: {
                // 处理多点触控移动
                for (int i = 0; i < event.getPointerCount(); i++) {
                    int id = event.getPointerId(i);
                    float moveX = event.getX(i);
                    float moveY = event.getY(i);
                    touchListener.onPointerMove(id, moveX, moveY, timestampNs);
                }
                break;
            }
            
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_POINTER_UP:
                touchListener.onPointerUp(pointerId, timestampNs);
                break;
                
            case MotionEvent.ACTION_CANCEL:
                touchListener.onPointerCancel(pointerId, timestampNs);
                break;
        }
        
        return true;
    }
    
    /**
     * 释放资源
     */
    public void destroy() {
        clearTouchListener();
    }
}
