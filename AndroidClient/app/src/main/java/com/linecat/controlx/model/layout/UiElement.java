package com.linecat.controlx.model.layout;

/**
 * UI 元素类
 */
public class UiElement {
    private String id;
    private Boolean enabled = true;
    private String anchor;
    private Offset offset;
    private Size size;
    private Float opacity = 1.0f;
    private String resource;
    private Hitbox hitbox;
    private Boolean clickThrough = false; // 点击穿透设置

    public UiElement() {}

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getAnchor() {
        return anchor;
    }

    public void setAnchor(String anchor) {
        this.anchor = anchor;
    }

    public Offset getOffset() {
        return offset;
    }

    public void setOffset(Offset offset) {
        this.offset = offset;
    }

    public Size getSize() {
        return size;
    }

    public void setSize(Size size) {
        this.size = size;
    }

    public Float getOpacity() {
        return opacity;
    }

    public void setOpacity(Float opacity) {
        this.opacity = opacity;
    }

    public String getResource() {
        return resource;
    }

    public void setResource(String resource) {
        this.resource = resource;
    }

    public Hitbox getHitbox() {
        return hitbox;
    }

    public void setHitbox(Hitbox hitbox) {
        this.hitbox = hitbox;
    }

    /**
     * 获取点击穿透设置
     * @return true: 点击事件穿透到下层窗口，false: 点击事件由布局消费
     */
    public Boolean getClickThrough() {
        return clickThrough;
    }

    /**
     * 设置点击穿透
     * @param clickThrough true: 点击事件穿透到下层窗口，false: 点击事件由布局消费
     */
    public void setClickThrough(Boolean clickThrough) {
        this.clickThrough = clickThrough;
    }
}