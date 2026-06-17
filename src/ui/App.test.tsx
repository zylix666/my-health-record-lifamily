import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Toast } from "./App";

describe("Toast", () => {
  it("dismisses after the configured number of seconds", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<Toast text="已新增攝取紀錄" durationSeconds={10} onDismiss={onDismiss} />);

    expect(screen.getByRole("status")).toHaveTextContent("已新增攝取紀錄");
    act(() => vi.advanceTimersByTime(9_999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("normalizes invalid durations to the default 10 seconds", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();

    render(<Toast text="設定已更新" durationSeconds={Number.NaN} onDismiss={onDismiss} />);

    act(() => vi.advanceTimersByTime(9_999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
