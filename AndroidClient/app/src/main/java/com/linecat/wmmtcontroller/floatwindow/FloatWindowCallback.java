package com.linecat.wmmtcontroller.floatwindow;

import com.linecat.wmmtcontroller.model.ConnectionInfo;

public interface FloatWindowCallback {
    void onConnectRequested();
    void onDisconnectRequested();
    void onSettingsSaved(ConnectionInfo info);
    void onLayoutEnabledChanged(boolean enabled);
    ConnectionInfo getConnectionInfo();
    boolean isConnectionInfoValid();
}
