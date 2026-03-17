package com.linecat.controlx.floatwindow;

import android.content.Context;
import android.graphics.Rect;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;

/**
 * 自定义 FrameLayout，实现触摸事件穿透
 * 只有当触摸事件落在可见的子 View 上时才拦截，否则让事件穿透到下层
 */
public class TouchThroughFrameLayout extends FrameLayout {

    public TouchThroughFrameLayout(Context context) {
        super(context);
    }

    public TouchThroughFrameLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public TouchThroughFrameLayout(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        return false;
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        if (isTouchOnVisibleChildView(event)) {
            return false;
        }
        return false;
    }

    /**
     * 检查触摸点是否落在任何可见的子 View 上
     */
    private boolean isTouchOnVisibleChildView(MotionEvent event) {
        float x = event.getX();
        float y = event.getY();

        for (int i = 0; i < getChildCount(); i++) {
            View child = getChildAt(i);
            if (child.getVisibility() == VISIBLE) {
                Rect rect = new Rect();
                child.getHitRect(rect);
                
                if (rect.contains((int) x, (int) y)) {
                    return true;
                }
            }
        }
        return false;
    }
}
