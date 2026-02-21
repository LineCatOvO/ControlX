package com.linecat.wmmtcontroller.floatwindow;

import android.content.Context;
import android.graphics.PixelFormat;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ListView;
import android.widget.Toast;

import com.linecat.wmmtcontroller.R;
import com.linecat.wmmtcontroller.input.LayoutRenderer;
import com.linecat.wmmtcontroller.input.LayoutSnapshot;
import com.linecat.wmmtcontroller.debug.RawInputInspectorManager;
import com.linecat.wmmtcontroller.model.ConnectionInfo;

import java.util.ArrayList;
import java.util.List;

/**
 * 浮窗管理器
 * 职责：仅负责浮窗 UI 的创建、显示、隐藏和更新
 * 不负责：连接控制、配置管理、业务逻辑
 */
public class FloatWindowManager {
    private static final String TAG = "FloatWindowManager";

    private View floatView;
    private WindowManager windowManager;
    private WindowManager.LayoutParams windowParams;
    private Context context;
    private boolean isShowing = false;
    private static FloatWindowManager instance;
    
    private FloatWindowCallback callback;

    private boolean isPopupMenuShowing = false;
    private boolean isLayoutManagementPanelShowing = false;

    private View circleEntryView;
    private View popupMenuView;
    private View layoutManagementPanelView;
    private CheckBox layoutEnabledCheckbox;
    private ListView layoutsListView;
    private ArrayAdapter<String> layoutsAdapter;
    private List<String> layoutsList = new ArrayList<>();
    
    private LayoutRenderer layoutRenderer;
    private FrameLayout layoutRenderContainer;

    private FloatWindowManager(Context context) {
        this.context = context.getApplicationContext();
        initFloatWindow();
    }

    public static synchronized FloatWindowManager getInstance(Context context) {
        if (instance == null) {
            instance = new FloatWindowManager(context);
        }
        return instance;
    }
    
    public void setCallback(FloatWindowCallback callback) {
        this.callback = callback;
        Log.d(TAG, "Callback已设置");
    }

    private void initFloatWindow() {
        windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);

        windowParams = new WindowManager.LayoutParams();

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            windowParams.type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            windowParams.type = WindowManager.LayoutParams.TYPE_PHONE;
        }

        windowParams.format = PixelFormat.RGBA_8888;
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;

        windowParams.gravity = Gravity.TOP | Gravity.LEFT;
        windowParams.x = 100;
        windowParams.y = 100;
        windowParams.width = WindowManager.LayoutParams.WRAP_CONTENT;
        windowParams.height = WindowManager.LayoutParams.WRAP_CONTENT;

        LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        floatView = inflater.inflate(R.layout.float_window, null);

        circleEntryView = floatView.findViewById(R.id.ll_circle_entry);
        popupMenuView = floatView.findViewById(R.id.ll_popup_menu);
        layoutManagementPanelView = floatView.findViewById(R.id.ll_layout_management_panel);
        layoutEnabledCheckbox = floatView.findViewById(R.id.cb_layout_enabled);
        layoutsListView = floatView.findViewById(R.id.lv_layouts);

        layoutEnabledCheckbox.setChecked(true);

        initLayoutsList();
        setupMenuItemListeners();
        setupLayoutManagementListeners();
        initLayoutRenderer();
        setupTouchListener();
    }
    
    private void setupTouchListener() {
        floatView.setOnTouchListener(new View.OnTouchListener() {
            private int lastX, lastY;
            private int paramX, paramY;
            private boolean isDragging = false;
            private boolean isClickingCircle = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        lastX = (int) event.getRawX();
                        lastY = (int) event.getRawY();
                        paramX = windowParams.x;
                        paramY = windowParams.y;
                        isDragging = false;
                        isClickingCircle = false;

                        int[] circleLocation = new int[2];
                        circleEntryView.getLocationOnScreen(circleLocation);
                        int circleLeft = circleLocation[0];
                        int circleTop = circleLocation[1];
                        int circleRight = circleLeft + circleEntryView.getWidth();
                        int circleBottom = circleTop + circleEntryView.getHeight();

                        int rawX = (int) event.getRawX();
                        int rawY = (int) event.getRawY();

                        if (rawX >= circleLeft && rawX <= circleRight && rawY >= circleTop && rawY <= circleBottom) {
                            isClickingCircle = true;
                        } else if (isPopupMenuShowing) {
                            hidePopupMenu();
                        } else if (isLayoutManagementPanelShowing) {
                            hideLayoutManagementPanel();
                        }
                        break;

                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) event.getRawX() - lastX;
                        int dy = (int) event.getRawY() - lastY;
                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                            isDragging = true;
                            windowParams.x = paramX + dx;
                            windowParams.y = paramY + dy;
                            windowManager.updateViewLayout(floatView, windowParams);
                        }
                        break;

                    case MotionEvent.ACTION_UP:
                        if (!isDragging && isClickingCircle) {
                            togglePopupMenu();
                        }
                        break;
                }
                
                if (isTouchOnVisibleChildView(event)) {
                    return true;
                }
                return false;
            }
        });
    }
    
    private boolean isTouchOnVisibleChildView(MotionEvent event) {
        if (event == null) return false;
        
        float x = event.getX();
        float y = event.getY();
        
        android.graphics.Rect rect = new android.graphics.Rect();
        
        if (circleEntryView.getVisibility() == View.VISIBLE) {
            circleEntryView.getHitRect(rect);
            if (rect.contains((int) x, (int) y)) {
                return true;
            }
        }
        
        if (popupMenuView.getVisibility() == View.VISIBLE) {
            popupMenuView.getHitRect(rect);
            if (rect.contains((int) x, (int) y)) {
                return true;
            }
        }
        
        if (layoutManagementPanelView.getVisibility() == View.VISIBLE) {
            layoutManagementPanelView.getHitRect(rect);
            if (rect.contains((int) x, (int) y)) {
                return true;
            }
        }
        
        View settingsPanel = floatView.findViewById(R.id.ll_settings_panel);
        if (settingsPanel.getVisibility() == View.VISIBLE) {
            settingsPanel.getHitRect(rect);
            if (rect.contains((int) x, (int) y)) {
                return true;
            }
        }
        
        return false;
    }

    private void initLayoutRenderer() {
        layoutRenderContainer = floatView.findViewById(R.id.layout_render_container);
        if (layoutRenderContainer == null) {
            Log.w(TAG, "layout_render_container not found in layout");
            return;
        }
        
        layoutRenderer = new LayoutRenderer(context);
        layoutRenderContainer.removeAllViews();
        layoutRenderContainer.addView(layoutRenderer, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        
        layoutRenderer.setLayoutEnabled(true);
    }

    private void setupMenuItemListeners() {
        floatView.findViewById(R.id.btn_start_connect).setOnClickListener(v -> {
            Log.d(TAG, "[连接流程] 开始连接按钮被点击");
            
            if (callback == null) {
                Log.e(TAG, "[连接流程] callback为null");
                Toast.makeText(context, "服务未初始化", Toast.LENGTH_SHORT).show();
                hidePopupMenu();
                return;
            }
            
            if (!callback.isConnectionInfoValid()) {
                Log.w(TAG, "[连接流程] 连接信息不完整");
                Toast.makeText(context, "请先填写完整的连接信息", Toast.LENGTH_SHORT).show();
                hidePopupMenu();
                return;
            }
            
            callback.onConnectRequested();
            hidePopupMenu();
        });

        floatView.findViewById(R.id.btn_stop_connect).setOnClickListener(v -> {
            Log.d(TAG, "[连接流程] 停止连接按钮被点击");
            
            if (callback == null) {
                Log.e(TAG, "[连接流程] callback为null");
                Toast.makeText(context, "服务未初始化", Toast.LENGTH_SHORT).show();
                hidePopupMenu();
                return;
            }
            
            callback.onDisconnectRequested();
            hidePopupMenu();
        });

        floatView.findViewById(R.id.btn_show_settings).setOnClickListener(v -> {
            Log.d(TAG, "Show settings button clicked");
            hidePopupMenu();
            showSettingsPanel();
        });

        floatView.findViewById(R.id.btn_layout_management).setOnClickListener(v -> {
            Log.d(TAG, "Layout management button clicked");
            hidePopupMenu();
            showLayoutManagementPanel();
        });
        
        floatView.findViewById(R.id.btn_raw_input_inspector).setOnClickListener(v -> {
            Log.d(TAG, "Raw input inspector button clicked");
            RawInputInspectorManager.getInstance(context).toggle();
            hidePopupMenu();
        });

        floatView.findViewById(R.id.btn_save_settings).setOnClickListener(v -> {
            Log.d(TAG, "Save settings button clicked");
            saveSettings();
            hideSettingsPanel();
        });

        floatView.findViewById(R.id.btn_cancel_settings).setOnClickListener(v -> {
            Log.d(TAG, "Cancel settings button clicked");
            hideSettingsPanel();
        });
    }

    private void togglePopupMenu() {
        if (isPopupMenuShowing) {
            hidePopupMenu();
        } else {
            showPopupMenu();
        }
    }

    private void showPopupMenu() {
        popupMenuView.setVisibility(View.VISIBLE);
        isPopupMenuShowing = true;
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        windowManager.updateViewLayout(floatView, windowParams);
        Log.d(TAG, "Popup menu showed");
    }

    private void hidePopupMenu() {
        popupMenuView.setVisibility(View.GONE);
        isPopupMenuShowing = false;
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        windowManager.updateViewLayout(floatView, windowParams);
        Log.d(TAG, "Popup menu hidden");
    }

    private void showSettingsPanel() {
        loadCurrentSettings();
        View settingsPanel = floatView.findViewById(R.id.ll_settings_panel);
        settingsPanel.setVisibility(View.VISIBLE);
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        windowManager.updateViewLayout(floatView, windowParams);
        Log.d(TAG, "Settings panel showed");
    }

    private void hideSettingsPanel() {
        View settingsPanel = floatView.findViewById(R.id.ll_settings_panel);
        settingsPanel.setVisibility(View.GONE);
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        windowManager.updateViewLayout(floatView, windowParams);
        Log.d(TAG, "Settings panel hidden");
    }

    private void loadCurrentSettings() {
        ConnectionInfo connectionInfo = null;
        if (callback != null) {
            connectionInfo = callback.getConnectionInfo();
        }

        EditText etAddress = floatView.findViewById(R.id.et_address);
        EditText etPort = floatView.findViewById(R.id.et_port);
        CheckBox cbUseTls = floatView.findViewById(R.id.cb_use_tls);

        if (connectionInfo != null) {
            etAddress.setText(connectionInfo.getAddress());
            etPort.setText(String.valueOf(connectionInfo.getPort()));
            cbUseTls.setChecked(connectionInfo.isUseTls());
        } else {
            etAddress.setText("localhost");
            etPort.setText("8080");
            cbUseTls.setChecked(false);
        }
    }

    private void saveSettings() {
        EditText etAddress = floatView.findViewById(R.id.et_address);
        EditText etPort = floatView.findViewById(R.id.et_port);
        CheckBox cbUseTls = floatView.findViewById(R.id.cb_use_tls);

        String address = etAddress.getText().toString().trim();
        String portStr = etPort.getText().toString().trim();
        boolean useTls = cbUseTls.isChecked();

        if (address.isEmpty()) {
            Log.w(TAG, "Address is empty, using default");
            address = "localhost";
        }

        int port;
        try {
            port = Integer.parseInt(portStr);
            if (port < 1 || port > 65535) {
                Log.w(TAG, "Invalid port, using default");
                port = 8080;
            }
        } catch (NumberFormatException e) {
            Log.w(TAG, "Invalid port format, using default");
            port = 8080;
        }

        ConnectionInfo connectionInfo = new ConnectionInfo(address, port);
        connectionInfo.setUseTls(useTls);
        connectionInfo.setDefault(true);

        if (callback != null) {
            callback.onSettingsSaved(connectionInfo);
        } else {
            Log.w(TAG, "Callback is null, settings not saved");
        }
    }

    public void showFloatWindow() {
        if (!isShowing) {
            try {
                windowManager.addView(floatView, windowParams);
                isShowing = true;
                Log.d(TAG, "Float window showed");
            } catch (Exception e) {
                Log.e(TAG, "Failed to show float window: " + e.getMessage());
            }
        }
    }

    public void hideFloatWindow() {
        if (isShowing) {
            try {
                windowManager.removeView(floatView);
                isShowing = false;
                Log.d(TAG, "Float window hidden");
            } catch (Exception e) {
                Log.e(TAG, "Failed to hide float window: " + e.getMessage());
            }
        }
    }

    public void updateStatusText(String status) {
        Log.d(TAG, "Float window status updated: " + status);
    }

    private void initLayoutsList() {
        layoutsList.add("默认键盘布局");

        layoutsAdapter = new ArrayAdapter<>(context,
                android.R.layout.simple_list_item_single_choice, layoutsList);
        layoutsListView.setAdapter(layoutsAdapter);
        layoutsListView.setChoiceMode(ListView.CHOICE_MODE_SINGLE);

        if (!layoutsList.isEmpty()) {
            layoutsListView.setItemChecked(0, true);
        }
    }
    
    private void updateLayoutRenderContainerVisibility(boolean enabled) {
        if (layoutRenderContainer != null) {
            layoutRenderContainer.setVisibility(enabled ? View.VISIBLE : View.GONE);
            
            android.view.ViewGroup.LayoutParams lp = layoutRenderContainer.getLayoutParams();
            if (enabled) {
                lp.width = ViewGroup.LayoutParams.MATCH_PARENT;
                lp.height = ViewGroup.LayoutParams.MATCH_PARENT;
            } else {
                lp.width = 1;
                lp.height = 1;
            }
            layoutRenderContainer.setLayoutParams(lp);
        }
    }

    private void setupLayoutManagementListeners() {
        layoutEnabledCheckbox.setOnCheckedChangeListener((buttonView, isChecked) -> {
            Log.d(TAG, "Layout enabled: " + isChecked);
            
            if (layoutRenderer != null) {
                layoutRenderer.setLayoutEnabled(isChecked);
            }
            
            updateLayoutRenderContainerVisibility(isChecked);
            
            if (callback != null) {
                callback.onLayoutEnabledChanged(isChecked);
            }
        });

        floatView.findViewById(R.id.btn_create_layout).setOnClickListener(v -> {
            Log.d(TAG, "Create layout button clicked");
            Toast.makeText(context, "创建布局功能开发中", Toast.LENGTH_SHORT).show();
        });

        floatView.findViewById(R.id.btn_edit_layout).setOnClickListener(v -> {
            Log.d(TAG, "Edit layout button clicked");
            int position = layoutsListView.getCheckedItemPosition();
            if (position != ListView.INVALID_POSITION) {
                String layoutName = layoutsList.get(position);
                Toast.makeText(context, "编辑布局: " + layoutName, Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(context, "请先选择一个布局", Toast.LENGTH_SHORT).show();
            }
        });

        floatView.findViewById(R.id.btn_delete_layout).setOnClickListener(v -> {
            Log.d(TAG, "Delete layout button clicked");
            int position = layoutsListView.getCheckedItemPosition();
            if (position != ListView.INVALID_POSITION) {
                String layoutName = layoutsList.get(position);
                layoutsList.remove(position);
                layoutsAdapter.notifyDataSetChanged();
                if (!layoutsList.isEmpty()) {
                    layoutsListView.setItemChecked(0, true);
                }
                Toast.makeText(context, "已删除布局: " + layoutName, Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(context, "请先选择一个布局", Toast.LENGTH_SHORT).show();
            }
        });

        floatView.findViewById(R.id.btn_back_from_layout).setOnClickListener(v -> {
            Log.d(TAG, "Back from layout management button clicked");
            hideLayoutManagementPanel();
        });
    }

    private void showLayoutManagementPanel() {
        layoutManagementPanelView.setVisibility(View.VISIBLE);
        isLayoutManagementPanelShowing = true;
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        windowManager.updateViewLayout(floatView, windowParams);
        Log.d(TAG, "Layout management panel showed");
    }

    private void hideLayoutManagementPanel() {
        layoutManagementPanelView.setVisibility(View.GONE);
        isLayoutManagementPanelShowing = false;
        windowParams.flags = WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON;
        windowManager.updateViewLayout(floatView, windowParams);
        Log.d(TAG, "Layout management panel hidden");
    }

    public void showConnectionError() {
        Toast.makeText(context, "连接失败，请检查服务器地址和端口", Toast.LENGTH_SHORT).show();
    }

    public boolean isFloatWindowShowing() {
        return isShowing;
    }

    public void setCurrentLayout(LayoutSnapshot layout) {
        if (layoutRenderer != null) {
            layoutRenderer.setLayout(layout);
        }
    }

    public void setInputController(com.linecat.wmmtcontroller.input.InteractionCapture inputController) {
        if (layoutRenderer != null) {
            layoutRenderer.setInputController(inputController);
        }
    }

    public void destroyFloatWindow() {
        hideFloatWindow();
        
        if (layoutRenderContainer != null) {
            layoutRenderContainer.removeAllViews();
            layoutRenderer = null;
        }
        
        instance = null;
    }
}
