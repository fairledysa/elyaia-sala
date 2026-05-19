const useDir = () => {
  // MVP: نخليها RTL ثابتة في لوحة التاجر
  const dir = "rtl";
  const isLTR = false;
  const isRTL = true;

  return { dir, isLTR, isRTL };
};

export default useDir;
