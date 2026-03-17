package com.linecat.controlx.floatwindow;

import com.linecat.controlx.model.ConnectionInfo;

public interface FloatWindowCallback {
    void onConnectRequested();
    void onDisconnectRequested();
    void onSettingsSaved(ConnectionInfo info);
    void onLayoutEnabledChanged(boolean enabled);
    ConnectionInfo getConnectionInfo();
    boolean isConnectionInfoValid();
}
