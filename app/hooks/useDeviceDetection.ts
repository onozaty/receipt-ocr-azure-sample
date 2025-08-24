import { useEffect, useState } from "react";

export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // タッチデバイスかどうかの判定
      const touchSupport =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setHasTouch(touchSupport);

      // モバイルデバイスかどうかの判定（画面サイズとUser Agentを組み合わせ）
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent,
        );
      const isSmallScreen = window.innerWidth <= 768;

      setIsMobile(isMobileUA || (touchSupport && isSmallScreen));
    };

    checkDevice();

    // リサイズ時に再チェック
    window.addEventListener("resize", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
    };
  }, []);

  return { isMobile, hasTouch };
}
