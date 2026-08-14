import "../global.css";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import {
  Award,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Compass,
  FileText,
  Heart,
  Home,
  LogOut,
  MapPinned,
  MapPin,
  QrCode,
  ScanLine,
  Search,
  Smartphone,
  Sparkles,
  Stamp,
  UserRound,
  X,
} from "lucide-react-native";
import { MOCK_CUSTOMERS } from "../src/mock/customers";
import { MOCK_PRODUCTS } from "../src/mock/products";
import { MOCK_BRIEFS } from "../src/mock/briefs";
import type { Customer, JourneyStamp, UserRole } from "../src/types";
import { colors as c } from "./theme";

type AuthScreen = "login" | "signup";
type StoreName = keyof typeof STORE_STAMP_IMAGES;
type AppState = {
  role: UserRole;
  setRole: (v: UserRole) => void;
  isLoggedIn: boolean;
  logout: () => void;
  authScreen: AuthScreen;
  setAuthScreen: (v: AuthScreen) => void;
  customers: Customer[];
  customer: Customer;
  select: (id: string) => void;
  toggleProduct: (id: string) => void;
  currentStore: StoreName;
  setCurrentStore: (store: StoreName) => void;
  addStamp: (id: string, type: JourneyStamp["type"]) => void;
  updateAvatar: (uri: string) => void;
};
const Ctx = createContext<AppState | null>(null);
const useApp = () => useContext(Ctx)!;
const storageKey = "mcm-mobile-customers";
const BRAND_LOGO = require("../logo.png");
const RECOMMEND_ICON = require("../recommend.png");

// 국내 공식 지점용 여권 도장. 실제 발급 날짜는 고객 데이터에서 별도로 표시한다.
const STORE_STAMP_IMAGES: Record<string, number> = {
  "MCM 하우스 플래그십스토어": require("../stores/journey-stamp-seoul-haus-flagship-96.png"),
  "MCM 롯데백화점 잠실점": require("../stores/journey-stamp-seoul-lotte-jamsil-96.png"),
  "MCM 롯데백화점 본점": require("../stores/journey-stamp-seoul-lotte-main-96.png"),
  "MCM 신라면세점 서울점": require("../stores/journey-stamp-seoul-shilla-duty-free-96.png"),
  "MCM 신세계면세점 명동점": require("../stores/journey-stamp-seoul-shinsegae-duty-free-main-96.png"),
  "MCM 현대면세점 무역센터점": require("../stores/journey-stamp-seoul-hyundai-duty-free-trade-center-96.png"),
  "MCM 롯데면세점 월드타워점": require("../stores/journey-stamp-seoul-lotte-world-tower-duty-free-96.png"),
  "MCM 파주 프리미엄 아울렛": require("../stores/journey-stamp-paju-premium-outlet-96.png"),
  "MCM 대구 롯데백화점": require("../stores/journey-stamp-daegu-lotte-96.png"),
  "MCM 부산 롯데면세점": require("../stores/journey-stamp-busan-lotte-duty-free-96.png"),
  "MCM 인천 T1 현대면세점": require("../stores/journey-stamp-incheon-t1-hyundai-duty-free-96.png"),
  "MCM 제주 신라면세점": require("../stores/journey-stamp-jeju-shilla-duty-free-96.png"),
  "MCM 제주 롯데면세점": require("../stores/journey-stamp-jeju-lotte-duty-free-96.png"),
};
const STORE_NAMES = Object.keys(STORE_STAMP_IMAGES) as StoreName[];

// 이전 데모 데이터와 새 지점명 사이의 연결표. 이미 저장된 고객 여정도 지점별 도장을 잃지 않는다.
const LEGACY_STORE_NAMES: Record<string, StoreName> = {
  "청담 플래그십 스토어": "MCM 하우스 플래그십스토어",
  "MCM 청담 플래그십": "MCM 하우스 플래그십스토어",
  "신세계 백화점 강남점": "MCM 신세계면세점 명동점",
  "안양 롯데 백화점": "MCM 롯데백화점 잠실점",
  "MCM 도쿄 긴자점": "MCM 롯데백화점 본점",
  "MCM 싱가포르 마리나베이": "MCM 제주 롯데면세점",
};
const getStampAsset = (storeName: string) =>
  STORE_STAMP_IMAGES[storeName] ?? STORE_STAMP_IMAGES[LEGACY_STORE_NAMES[storeName]];
const formatStoreName = (storeName: string) =>
  storeName === "MCM 하우스 플래그십스토어"
    ? "MCM 하우스\n플래그십스토어"
    : storeName.replace(" 롯데백화점 ", " 롯데백화점\n").replace(" 면세점 ", " 면세점\n");

function Provider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("customer");
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const setRole = (nextRole: UserRole) => {
    setRoleState(nextRole);
    setLoggedIn(true);
  };
  const logout = () => {
    setLoggedIn(false);
    setRoleState("customer");
    setAuthScreen("login");
  };
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [selected, select] = useState("cust-01");
  const [currentStore, setCurrentStore] = useState<StoreName>(
    "MCM 하우스 플래그십스토어",
  );
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((v) => {
        if (!v) return;
        const savedCustomers = JSON.parse(v) as Customer[];
        setCustomers(
          savedCustomers.map((customer) => ({
            ...customer,
            stamps: customer.stamps.map((stamp) => ({
              ...stamp,
              storeName: LEGACY_STORE_NAMES[stamp.storeName] ?? stamp.storeName,
            })),
          })),
        );
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(storageKey, JSON.stringify(customers));
  }, [customers]);
  const customer = customers.find((x) => x.id === selected) ?? customers[0];
  const value = useMemo(
    () => ({
      role,
      setRole,
      isLoggedIn,
      logout,
      authScreen,
      setAuthScreen,
      customers,
      customer,
      select,
      currentStore,
      setCurrentStore,
      toggleProduct: (id: string) =>
        setCustomers((all) =>
          all.map((x) =>
            x.id !== selected
              ? x
              : {
                  ...x,
                  savedProductIds: x.savedProductIds.includes(id)
                    ? x.savedProductIds.filter((v) => v !== id)
                    : [...x.savedProductIds, id],
                },
          ),
        ),
      addStamp: (id: string, type: JourneyStamp["type"]) =>
        setCustomers((all) =>
          all.map((x) =>
            x.id !== id
              ? x
              : {
                  ...x,
                  visitCount: x.visitCount + 1,
                  stamps: [
                    {
                      id: `stamp-${Date.now()}`,
                      type,
                      storeName: currentStore,
                      issuedAt: new Date().toISOString(),
                      issuedByCA: "이현우 CA",
                    },
                    ...x.stamps,
                  ],
                },
          ),
        ),
      updateAvatar: (uri: string) =>
        setCustomers((all) =>
          all.map((x) => (x.id === selected ? { ...x, avatarUrl: uri } : x)),
        ),
    }),
    [role, isLoggedIn, authScreen, customers, selected, currentStore],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function Pill({
  children,
  tone = "gold",
}: {
  children: React.ReactNode;
  tone?: "gold" | "wine" | "forest";
}) {
  const bg =
    tone === "wine" ? "#F0DFE1" : tone === "forest" ? "#DCE8E2" : "#F4E6C4";
  const fg = tone === "wine" ? c.wine : tone === "forest" ? c.forest : c.gold;
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: fg }]}>{children}</Text>
    </View>
  );
}
function Button({
  children,
  onPress,
  secondary = false,
  icon,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.button, secondary && s.buttonSecondary]}
    >
      <View style={s.buttonContent}>
        {icon}
        {
          <Text style={[s.buttonText, secondary && s.buttonTextSecondary]}>
            {children}
          </Text>
        }
      </View>
    </Pressable>
  );
}
function Card({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return <View style={[s.card, dark && s.darkCard]}>{children}</View>;
}
function Header({ title, back = false }: { title: string; back?: boolean }) {
  const n = useNavigation<any>();
  return (
    <View style={s.header}>
      <Pressable
        hitSlop={12}
        onPress={() => (back ? n.goBack() : undefined)}
        style={[s.headerMark, !back && s.headerLogoMark]}
      >
        {back ? <Text style={s.headerMarkText}>‹</Text> : <Image source={BRAND_LOGO} style={s.headerLogo} resizeMode="contain" />}
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.headerKicker}>MCM PRIVATE CIRCLE</Text>
        <Text style={s.headerTitle}>{title}</Text>
      </View>
    </View>
  );
}
type ScreenPreset = "compact" | "content" | "wide";
function useResponsive() {
  const { width } = useWindowDimensions();
  return {
    width,
    isTablet: width >= 768,
    isWide: width >= 1024,
    horizontalPadding: width >= 1024 ? 20 : width >= 640 ? 24 : 16,
  };
}
function Screen({
  children,
  title,
  back = false,
  preset = "content",
}: {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  preset?: ScreenPreset;
}) {
  const { horizontalPadding } = useResponsive();
  const maxWidth = preset === "compact" ? 560 : preset === "wide" ? 1180 : 820;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      {title && <Header title={title} back={back} />}
      <ScrollView
        contentContainerStyle={s.scrollOuter}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[s.scroll, { maxWidth, paddingHorizontal: horizontalPadding }]}
        >
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Login() {
  const { setRole, select, customers, setAuthScreen } = useApp();
  const { isTablet, horizontalPadding } = useResponsive();
  const [role, choose] = useState<UserRole>("customer");
  const enter = () => {
    setRole(role);
    select("cust-01");
  };
  const isCustomer = role === "customer";
  return (
    <SafeAreaView style={[s.safe, s.login, isTablet && s.loginTablet]}>
      <StatusBar style="light" />
      <View style={[s.loginDark, isTablet && s.loginDarkTablet]}>
        <View style={isTablet ? s.loginInner : undefined}>
          <Image source={BRAND_LOGO} style={s.loginLogo} resizeMode="contain" />
          <View style={s.loginHeroSpacer} />
          <Pill>JOURNEY PASSPORT</Pill>
          <Text style={[s.loginHeadline, isTablet && s.loginHeadlineTablet]}>
            고객의 모든 여정을{`\n`}더 특별하게 기억합니다
          </Text>
          <Text style={s.darkBody}>
            방문·상담·구매·케어 이력을 하나의 프라이빗 여권에 담습니다.
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          s.loginForm,
          isTablet && s.loginFormTablet,
          {
            paddingHorizontal: isTablet ? Math.max(horizontalPadding, 48) : 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={isTablet ? s.loginFormInner : undefined}>
          <View style={s.authTopRow}>
            <View>
              <Text style={[s.kicker, s.loginKicker]}>
                {isCustomer ? "WELCOME BACK" : "CA WORKSTATION"}
              </Text>
              <Text style={s.pageTitle}>
                {isCustomer ? "로그인" : "CA 로그인"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="CA 로그인 전환"
              onPress={() => choose(isCustomer ? "ca" : "customer")}
              style={[s.roleSwitch, !isCustomer && s.roleSwitchActive]}
            >
              <Smartphone size={20} color={!isCustomer ? c.paper : c.ink} />
              <Text
                style={[
                  s.roleSwitchText,
                  !isCustomer && s.roleSwitchTextActive,
                ]}
              >
                {isCustomer ? "CA" : "고객"}
              </Text>
            </Pressable>
          </View>
          <View style={s.loginIntro}>
            <Text style={s.body}>
              {isCustomer
                ? "MCM Private Circle 고객 계정으로 로그인하세요."
                : "매장 담당자 전용 로그인입니다."}
            </Text>
          </View>
          <View style={s.authField}>
            <Text style={s.label}>{isCustomer ? "이메일 또는 휴대폰 번호" : "담당 CA 사번"}</Text>
            <TextInput style={s.textInput} placeholder={isCustomer ? "example@email.com" : "CA-1092"} placeholderTextColor={c.muted} autoCapitalize="none" />
          </View>
          <View style={[s.authField, s.passwordField]}>
            <Text style={s.label}>비밀번호</Text>
            <TextInput style={s.textInput} placeholder="비밀번호를 입력하세요" placeholderTextColor={c.muted} secureTextEntry />
          </View>
          <View style={s.loginButtonWrap}>
            <Button onPress={enter} icon={<ChevronRight color={c.paper} size={24} />}>
              {isCustomer ? "로그인하고 여권 보기" : "CA Workstation 시작"}
            </Button>
          </View>
          {isCustomer && (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAuthScreen("signup")}
                style={s.signupLink}
              >
                <Text style={s.signupText}>아직 계정이 없으신가요? </Text>
                <Text style={s.signupLinkText}>회원가입</Text>
              </Pressable>
              <Text style={s.demo}>데모 계정으로 바로 입장할 수 있습니다.</Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function SignUp() {
  const { setAuthScreen, setRole, select } = useApp();
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={s.signupOuter}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.signupInner}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAuthScreen("login")}
            style={s.backText}
          >
            <Text style={s.link}>‹ 로그인으로 돌아가기</Text>
          </Pressable>
          <Text style={s.signupKicker}>PRIVATE CIRCLE MEMBERSHIP</Text>
          <Text style={s.pageTitle}>회원가입</Text>
          <Text style={s.body}>
            MCM과의 특별한 여정을 시작하기 위한{"\n"}기본 정보를 입력해 주세요.
          </Text>
          <Card>
            <Text style={s.label}>이름</Text>
            <TextInput
              style={s.textInput}
              placeholder="이름을 입력하세요"
              placeholderTextColor={c.muted}
            />
            <Text style={s.label}>이메일</Text>
            <TextInput
              style={s.textInput}
              placeholder="example@email.com"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={s.label}>비밀번호</Text>
            <TextInput
              style={s.textInput}
              placeholder="8자 이상 입력하세요"
              placeholderTextColor={c.muted}
              secureTextEntry
            />
            <Text style={s.caption}>
              가입 후 MCM과의 여정을 Journey Passport에서 관리할 수 있습니다.
            </Text>
          </Card>
          <Button
            onPress={() => {
              select("cust-01");
              setRole("customer");
            }}
          >
            회원가입 완료
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
function Splash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);
  return (
    <SafeAreaView style={s.splash}>
      <StatusBar style="light" />
      <Pressable style={s.splashPress} onPress={onComplete}>
        <Image source={BRAND_LOGO} style={s.splashLogo} resizeMode="contain" />
      </Pressable>
    </SafeAreaView>
  );
}

function CustomerHome() {
  const { customer } = useApp();
  const n = useNavigation<any>();
  const [qr, setQr] = useState(false);
  const isVip = customer.membershipTier === "VIP";
  return (
    <Screen>
      <View style={s.brandRow}>
        <View style={s.homeLogoPlate}>
          <Image source={BRAND_LOGO} style={s.homeLogo} resizeMode="contain" />
        </View>
        {isVip && <Pill tone="wine">VIP</Pill>}
      </View>
      <Text style={s.kicker}>MCM JOURNEY PASSPORT</Text>
      <Text style={s.homeGreeting}>안녕하세요, {customer.name} 님</Text>
      <Text style={s.body}>국내 MCM 매장에서 기록한 나만의 여정입니다.</Text>
      <Card dark>
        <Text style={s.darkKicker}>OFFICIAL DIGITAL PASSPORT</Text>
        <Text style={s.passportName}>{customer.name}</Text>
        <Text style={s.darkBody}>{customer.customerNo}</Text>
        <View style={s.stats}>
          <Stat
            dark
            label="누적 방문 스탬프"
            value={`${customer.stamps.length}개 도장`}
          />
          <Stat dark label="가입일" value={customer.joinedAt} />
        </View>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={() => setQr(true)}
              icon={<QrCode size={18} color={c.ink} />}
            >
              식별 QR코드
            </Button>
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Button
              secondary
              onPress={() => n.navigate("Passport")}
              icon={<BookOpen size={18} color={c.ink} />}
            >
              여권 상세
            </Button>
          </View>
        </View>
      </Card>
      <SectionTitle
        title="최근 방문 여정 도장"
        action={() => n.navigate("Journey")}
      />
      <FlatList
        horizontal
        data={customer.stamps.slice(0, 3)}
        keyExtractor={(x) => x.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <StampCard item={item} />}
        contentContainerStyle={{ gap: 12 }}
      />
      <SectionTitle title="고객 맞춤 추천 제품" action={() => n.navigate("Recommendations")} />
      <ProductList products={MOCK_PRODUCTS.slice(0, 3)} />
      <View style={s.homeActionList}>
        <Pressable onPress={() => n.navigate("Passport")} style={s.homeActionDark}>
          <BookOpen color={c.paper} size={24} />
          <Text style={s.homeActionDarkText}>Journey Passport</Text>
          <ChevronRight color={c.paper} size={24} />
        </Pressable>
        <Pressable onPress={() => n.navigate("Saved")} style={s.homeActionLight}>
          <Heart color={c.gold} size={24} />
          <Text style={s.homeActionLightText}>관심 저장 제품</Text>
          <ChevronRight color={c.gold} size={24} />
        </Pressable>
      </View>
      <Modal transparent visible={qr} animationType="fade">
        <View style={s.modal}>
          <Card>
            <View style={s.row}>
              <Text style={s.sectionTitle}>매장 스캐너 제시용 QR</Text>
              <Pressable onPress={() => setQr(false)}>
                <X color={c.ink} />
              </Pressable>
            </View>
            <View style={s.fakeQr}>
              <QRCode value={`mcm-private-circle://customer/${customer.customerNo}`} size={190} color={c.paper} backgroundColor={c.ink} />
            </View>
            <Text style={s.body}>
              매장 방문 시 담당 CA에게 이 QR을 보여주세요.
            </Text>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
function Stat({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.caption, dark && { color: "#CFC8BC" }]}>{label}</Text>
      <Text style={[s.statValue, dark && { color: c.champagne }]}>{value}</Text>
    </View>
  );
}
function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: () => void;
}) {
  return (
    <View style={s.sectionRow}>
      <View>
        <Text style={s.kicker}>PRIVATE CIRCLE</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {action && (
        <Pressable onPress={action} style={s.sectionAction}>
          <Text style={s.link}>전체 보기</Text>
          <ChevronRight size={18} color={c.gold} />
        </Pressable>
      )}
    </View>
  );
}
function StampCard({ item }: { item: JourneyStamp }) {
  const asset = getStampAsset(item.storeName);
  return (
    <View style={s.stampPreview}>
      {asset ? (
        <Image source={asset} style={s.stampImage} resizeMode="contain" />
      ) : (
        <View style={s.stampFallback}>
          <Stamp color={c.wine} size={24} />
        </View>
      )}
      <Text numberOfLines={2} style={s.stampTitle}>
        {formatStoreName(item.storeName)}
      </Text>
      <Text style={s.stampDate}>{item.issuedAt.slice(0, 10)}</Text>
    </View>
  );
}
function ProductList({ products }: { products: typeof MOCK_PRODUCTS }) {
  const { customer, toggleProduct } = useApp();
  const { isTablet } = useResponsive();
  return (
    <View style={[s.productList, isTablet && s.productGrid]}>
      {products.map((p) => (
        <View
          key={p.productId}
          style={isTablet ? s.productGridItem : undefined}
        >
          <Card>
            <View style={[s.row, isTablet && s.productCardTablet]}>
              <Image
                source={{ uri: p.imageUrl }}
                style={[s.productImage, isTablet && s.productImageTablet]}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{p.productName}</Text>
                <Text style={s.body}>{p.variant}</Text>
                <Text style={s.price}>{p.price.toLocaleString()}원</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${p.productName} 관심 저장`}
                onPress={() => toggleProduct(p.productId)}
              >
                <Heart
                  size={22}
                  color={
                    customer.savedProductIds.includes(p.productId)
                      ? c.wine
                      : c.muted
                  }
                  fill={
                    customer.savedProductIds.includes(p.productId)
                      ? c.wine
                      : "none"
                  }
                />
              </Pressable>
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}
function Quick({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={s.quick}>
      {icon}
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.caption}>자세히 보기</Text>
    </Pressable>
  );
}

function Passport() {
  const { customer } = useApp();
  const n = useNavigation<any>();
  const [qr, setQr] = useState(false);
  const lastStamp = customer.stamps[0];
  const lastPurchase = customer.purchases[0];
  return (
    <Screen title="Journey Passport" back>
      <Card dark>
        <View style={s.passportCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.darkKicker}>OFFICIAL DIGITAL PASSPORT</Text>
            <Text style={s.passportName}>{customer.name}</Text>
            <Text style={s.darkBody}>MEMBER NO. {customer.customerNo}</Text>
          </View>
          <Pressable onPress={() => setQr(true)} style={s.passportQrDark} accessibilityLabel="고객 식별 QR 열기">
            <QrCode size={34} color={c.champagne} />
          </Pressable>
        </View>
        <View style={s.stats}>
          <Stat dark label="MEMBERSHIP" value={customer.membershipTier} />
          <Stat dark label="가입일" value={customer.joinedAt} />
        </View>
      </Card>
      <Text style={s.summaryTitle}>최근 여정 요약</Text>
      <Card>
        <View style={s.summaryRow}><MapPin size={22} color={c.gold} /><View><Text style={s.caption}>마지막 방문</Text><Text style={s.cardTitle}>{lastStamp ? `${lastStamp.storeName} · ${lastStamp.issuedAt.slice(0, 7)}` : "첫 방문을 기다리고 있어요"}</Text></View></View>
        <View style={s.summaryRow}><CalendarDays size={22} color={c.gold} /><View><Text style={s.caption}>총 방문 스탬프</Text><Text style={s.cardTitle}>{customer.stamps.length}개</Text></View></View>
        {lastPurchase && <View style={s.summaryRow}><Sparkles size={22} color={c.gold} /><View><Text style={s.caption}>최근 구매</Text><Text style={s.cardTitle}>{lastPurchase.purchasedAt} · {lastPurchase.productName}</Text></View></View>}
      </Card>
      <SectionTitle title="나의 국내 방문 도장" />
      <View style={s.passportStampGrid}>
        {customer.stamps.map((x) => (
          <StampCard key={x.id} item={x} />
        ))}
      </View>
      <Button onPress={() => n.navigate("Journey")}>여정 기록 전체 보기</Button>
      <Modal transparent visible={qr} animationType="fade">
        <View style={s.modal}>
          <Card>
            <View style={s.row}><Text style={s.sectionTitle}>고객 식별 QR</Text><Pressable onPress={() => setQr(false)}><X color={c.ink} size={26} /></Pressable></View>
            <View style={s.realQr}><QRCode value={`mcm-private-circle://customer/${customer.customerNo}`} size={216} color={c.ink} backgroundColor={c.paper} /></View>
            <Text style={s.body}>매장 방문 시 담당 CA에게 보여주세요.</Text>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
function Journey() {
  const { customer } = useApp();
  const [tab, setTab] = useState<"stamps" | "records">("stamps");
  return (
    <Screen title="나의 여정" back>
      <Text style={s.kicker}>JOURNEY ARCHIVE</Text>
      <Text style={s.pageTitle}>나의 여정</Text>
      <Text style={s.journeyDescription}>방문, 구매, 케어의 순간</Text>
      <View style={s.segment}>
        <Pressable
          onPress={() => setTab("stamps")}
          style={[s.segmentItem, tab === "stamps" && s.segmentActive]}
        >
          <Text style={s.cardTitle}>방문 스탬프</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab("records")}
          style={[s.segmentItem, tab === "records" && s.segmentActive]}
        >
          <Text style={s.cardTitle}>구매·케어 이력</Text>
        </Pressable>
      </View>
      {tab === "stamps" && customer.stamps.length === 0 ? (
        <EmptyJourney />
      ) : tab === "stamps" ? (
        <View style={s.journeyTimeline}>
          {customer.stamps.map((x, index) => {
            const asset = getStampAsset(x.storeName);
            return (
              <View key={x.id} style={s.journeyStop}>
                {index < customer.stamps.length - 1 && <View style={s.journeyRail} />}
                {asset ? (
                  <Image source={asset} style={s.journeyStampImage} />
                ) : (
                  <View style={s.journeyDot}><MapPin size={20} color={c.wine} /></View>
                )}
                <View style={s.journeyCopy}>
                  <Text style={s.journeyMonth}>{x.issuedAt.slice(0, 7).replace("-", "년 ")}월</Text>
                  <Text style={s.cardTitle}>{x.storeName}</Text>
                  <Text style={s.body}>{x.issuedAt.slice(0, 10).replace(/-/g, ". ")}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={s.recordList}>
          {customer.purchases.map((purchase) => (
            <Card key={purchase.id}>
              <View style={s.row}>
                <Image source={{ uri: purchase.imageUrl }} style={s.recordImage} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{purchase.productName}</Text>
                  <Text style={s.body}>{purchase.variant}</Text>
                  <Text style={s.price}>{purchase.price.toLocaleString()}원</Text>
                </View>
              </View>
              <View style={s.recordMeta}><CalendarDays size={18} color={c.gold} /><Text style={s.caption}>구매 · {purchase.purchasedAt} · {purchase.storeName ?? "국내 MCM 매장"}</Text></View>
            </Card>
          ))}
          {customer.careRecords.map((record) => (
            <Card key={record.id}>
              <Text style={s.kicker}>CARE NOTE</Text>
              <Text style={s.cardTitle}>{record.type}</Text>
              <Text style={s.body}>{record.note}</Text>
              <Text style={s.caption}>케어 · {record.date} · {record.storeName ?? "국내 MCM 매장"}</Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
function Recommendations() {
  return (
    <Screen title="맞춤 추천" back>
      <Text style={s.pageTitle}>고객 맞춤 추천 제품</Text>
      <Text style={s.recommendationDescription}>고객님만을 위한 MCM의 추천 제품입니다.</Text>
      <ProductList products={MOCK_PRODUCTS} />
    </Screen>
  );
}
function EmptyJourney() {
  const n = useNavigation<any>();
  return <View style={s.emptyJourney}><View style={s.emptyJourneyIcon}><MapPinned size={44} color={c.forest} /></View><Text style={s.emptyJourneyTitle}>여정을 시작하세요</Text><Text style={s.emptyJourneyBody}>MCM과 함께하는 첫 번째 방문을 Journey Passport에 기록합니다.</Text><Button onPress={() => n.navigate("Passport")} icon={<BookOpen color={c.paper} size={24} />}>여권 프로필 확인</Button><Button secondary onPress={() => n.navigate("Recommendations")}>추천 제품 보기</Button></View>;
}
function Profile() {
  const { customer, logout, updateAvatar } = useApp();
  const n = useNavigation<any>();
  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) updateAvatar(result.assets[0].uri);
  };
  return (
    <Screen>
      <Text style={s.profileKicker}>MY PASSPORT</Text>
      <Text style={s.pageTitle}>나의 여권</Text>
      <Card dark>
        <View style={s.profilePassportTop}>
          <Pressable onPress={pickProfilePhoto} style={s.profilePhotoFrame}>
            <Image source={{ uri: customer.avatarUrl }} style={s.profilePhoto} />
            <View style={s.photoEdit}><Text style={s.photoEditText}>변경</Text></View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.darkKicker}>PASSPORT HOLDER</Text>
            <Text style={s.passportName}>{customer.name}</Text>
            <Text style={s.darkBody}>MEMBER NO. {customer.customerNo}</Text>
          </View>
          {customer.membershipTier === "VIP" && <View style={s.profileVip}><Pill tone="wine">VIP</Pill></View>}
        </View>
        <View style={s.stats}>
          <Stat dark label="국내 방문" value={`${customer.stamps.length}곳`} />
          <Stat dark label="가입일" value={customer.joinedAt} />
        </View>
      </Card>
      <Button
        secondary
        onPress={() => n.navigate("Benefits")}
        icon={<Award size={18} color={c.ink} />}
      >
        멤버십 혜택
      </Button>
      <Button
        secondary
        onPress={() => n.navigate("Saved")}
        icon={<Heart size={18} color={c.ink} />}
      >
        관심 저장 제품
      </Button>
      <Pressable
        accessibilityRole="button"
        onPress={logout}
        style={s.logoutButton}
      >
        <LogOut color={c.wine} size={20} />
        <Text style={s.logoutText}>로그아웃</Text>
      </Pressable>
    </Screen>
  );
}
function Benefits() {
  return (
    <Screen title="VIP 혜택" back>
      <Text style={s.pageTitle}>Private Circle 혜택</Text>
      {[
        "우선 예약 및 전용 상담",
        "시즌별 퍼스널 큐레이션",
        "제품 케어 및 리페어 지원",
      ].map((x) => (
        <Card key={x}>
          <Award size={22} color={c.gold} />
          <Text style={s.cardTitle}>{x}</Text>
          <Text style={s.body}>
            멤버십 등급 및 매장 정책에 따라 제공됩니다.
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
function Saved() {
  const { customer } = useApp();
  const saved = MOCK_PRODUCTS.filter((x) =>
    customer.savedProductIds.includes(x.productId),
  );
  return (
    <Screen title="관심 저장 제품" back>
      {saved.length ? (
        <ProductList products={saved} />
      ) : (
        <Card>
          <Heart size={28} color={c.muted} />
          <Text style={s.body}>아직 저장한 제품이 없습니다.</Text>
        </Card>
      )}
    </Screen>
  );
}

function CaHome() {
  const { customers, select, logout, currentStore, setCurrentStore } =
    useApp();
  const n = useNavigation<any>();
  const { isTablet } = useResponsive();
  const clientList = (
    <>
      <SectionTitle title="최근 고객" />
      {customers.map((x) => (
        <Pressable
          accessibilityRole="button"
          key={x.id}
          onPress={() => {
            select(x.id);
            n.navigate("CustomerDetail", { id: x.id });
          }}
        >
          <Card>
            <View style={s.row}>
              <Image source={{ uri: x.avatarUrl }} style={s.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{x.name} 님</Text>
                <Text style={s.body}>
                  {x.membershipTier === "VIP" ? "VIP · " : ""}스탬프{" "}
                  {x.stamps.length}개
                </Text>
              </View>
              <ChevronRight color={c.gold} />
            </View>
          </Card>
        </Pressable>
      ))}
    </>
  );
  const actions = (
    <>
      <View style={[s.caDashboardTop, isTablet && s.caDashboardTopTablet]}>
        <Pressable style={s.caScanHero} onPress={() => n.navigate("Scanner")}>
          <View style={s.caScanIcon}><QrCode color={c.ink} size={34} /></View>
          <View><Text style={s.passportName}>Journey Passport 스캔</Text><Text style={s.darkBody}>QR 카메라 열기</Text></View>
        </Pressable>
        <View style={s.caSearchBox}>
          <View style={s.caSearchTitle}><Search color={c.gold} size={30} /><Text style={s.sectionTitle}>고객 검색</Text></View>
          <TextInput placeholder="이름 · 연락처 · 이메일" placeholderTextColor={c.muted} style={s.textInput} />
          <Button secondary onPress={() => n.navigate("Search")} icon={<Search size={22} color={c.ink} />}>고객 조회</Button>
        </View>
      </View>
      <Card>
        <Text style={s.kicker}>CURRENT STORE</Text>
        <Text style={s.cardTitle}>현재 근무 지점</Text>
        <Text style={s.body}>선택한 지점의 고유 도장이 고객 여권에 발급됩니다.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storePicker}>
          {STORE_NAMES.map((store) => {
            const selectedStore = store === currentStore;
            return (
              <Pressable
                key={store}
                onPress={() => setCurrentStore(store)}
                style={[s.storeOption, selectedStore && s.storeOptionActive]}
              >
                <Image source={STORE_STAMP_IMAGES[store]} style={s.storeOptionStamp} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={[s.storeOptionText, selectedStore && s.storeOptionTextActive]}>
                  {store.replace("MCM ", "")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Card>
      <Card>
        <Text style={s.kicker}>TODAY AT A GLANCE</Text>
        <Text style={s.cardTitle}>상담 예정 고객 3명</Text>
        <Text style={s.body}>
          방문 전 여정 기록과 AI 브리프를 확인해 주세요.
        </Text>
      </Card>
    </>
  );
  return (
    <Screen title="CA Workstation" preset="wide">
      {isTablet ? (
        <View style={s.caColumns}>
          <View style={s.caMain}>{actions}</View>
          <View style={s.caSide}>
            {clientList}
            <Pressable
              accessibilityRole="button"
              onPress={logout}
              style={s.logoutButton}
            >
              <LogOut color={c.wine} size={18} />
              <Text style={s.logoutText}>로그아웃</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {actions}
          {clientList}
          <Pressable
            accessibilityRole="button"
            onPress={logout}
            style={s.logoutButton}
          >
            <LogOut color={c.wine} size={18} />
            <Text style={s.logoutText}>로그아웃</Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}
function Scanner() {
  const { customer } = useApp();
  const n = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  if (!permission?.granted) {
    return <Screen title="QR 카메라" back><View style={s.cameraPermission}><ScanLine size={58} color={c.gold} /><Text style={s.pageTitle}>카메라 권한이 필요합니다</Text><Text style={s.body}>고객의 Journey Passport QR을 확인하기 위해 카메라 접근을 허용해 주세요.</Text><Button onPress={() => requestPermission()}>카메라 권한 허용</Button></View></Screen>;
  }
  return (
    <Screen title="QR 스캐너" back>
      <View style={s.cameraFrame}><CameraView style={s.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanned ? undefined : () => { setScanned(true); n.navigate("CustomerDetail", { id: customer.id }); }} /><View pointerEvents="none" style={s.cameraGuide} /></View>
      <Text style={s.body}>고객 QR을 네모 안에 맞춰 주세요.</Text>
    </Screen>
  );
}
function SearchScreen() {
  const { customers, select } = useApp();
  const n = useNavigation<any>();
  const [query, setQuery] = useState("");
  const filtered = customers.filter(
    (x) => x.name.includes(query) || x.customerNo.includes(query),
  );
  return (
    <Screen title="고객 검색" back>
      <TextInput
        placeholder="이름 또는 고객 번호"
        value={query}
        onChangeText={setQuery}
        style={s.textInput}
      />
      {filtered.map((x) => (
        <Pressable
          key={x.id}
          onPress={() => {
            select(x.id);
            n.navigate("CustomerDetail", { id: x.id });
          }}
        >
          <Card>
            <Text style={s.cardTitle}>
              {x.name} · {x.customerNo}
            </Text>
            <Text style={s.body}>
              {x.membershipTier === "VIP" ? "VIP 고객" : "일반 고객"}
            </Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
function CustomerDetail() {
  const { customer } = useApp();
  const n = useNavigation<any>();
  const { isTablet } = useResponsive();
  const profile = (
    <>
      <Card dark>
        <View style={s.row}>
          <Image source={{ uri: customer.avatarUrl }} style={s.avatar} />
          <View>
            <Text style={s.passportName}>{customer.name} 님</Text>
            <Text style={s.darkBody}>***-****-{customer.phoneLast4}</Text>
          </View>
        </View>
        <View style={s.stats}>
          <Stat dark label="등급" value={customer.membershipTier} />
          <Stat dark label="가입일" value={customer.joinedAt} />
        </View>
      </Card>
      <View style={s.grid}>
        <Quick
          icon={<Sparkles color={c.gold} />}
          title="자세한 AI 응대 브리프"
          onPress={() => n.navigate("Brief")}
        />
        <Quick
          icon={<FileText color={c.gold} />}
          title="오늘의 상담 기록"
          onPress={() => n.navigate("Consultation")}
        />
        <Quick
          icon={<Stamp color={c.gold} />}
          title="스탬프 발급"
          onPress={() => n.navigate("IssueStamp")}
        />
        <Quick
          icon={<Heart color={c.gold} />}
          title="CA PICK 추천"
          onPress={() => n.navigate("CaRecommendations")}
        />
      </View>
    </>
  );
  const context = (
    <>
      <SectionTitle title="응대 맥락 & 선호" />
      <Card>
        <Text style={s.label}>방문 목적</Text>
        <Text style={s.body}>{customer.purchasePurpose}</Text>
        <Text style={s.label}>선호 스타일</Text>
        <Text style={s.body}>
          {customer.preferredStyle.map((x) => `#${x}`).join("  ")}
        </Text>
      </Card>
      {customer.cautionNotes && (
        <View style={s.cautionCard}>
          <Text style={[s.cardTitle, { color: c.wine }]}>
            CA 전용 응대 주의사항
          </Text>
          <Text style={s.body}>{customer.cautionNotes}</Text>
        </View>
      )}
    </>
  );
  return (
    <Screen title={`${customer.name} 님 상세`} back preset="wide">
      {isTablet ? (
        <View style={s.caColumns}>
          <View style={s.caMain}>{profile}</View>
          <View style={s.caSide}>{context}</View>
        </View>
      ) : (
        <>
          {profile}
          {context}
        </>
      )}
    </Screen>
  );
}
function Brief() {
  const { customer } = useApp();
  const brief = MOCK_BRIEFS[customer.id];
  return (
    <Screen title="자세한 AI 응대 브리프" back>
      <Card dark>
        <Text style={s.darkKicker}>HUMAN-FIRST AI</Text>
        <Text style={s.passportName}>응대 전략</Text>
        <Text style={s.darkBody}>
          {brief?.suggestedApproach ?? "고객의 최신 여정을 우선 확인해 주세요."}
        </Text>
      </Card>
      <SectionTitle title="분석 근거" />
      {(brief?.basis ?? []).map((x) => (
        <Card key={x}>
          <Text style={s.body}>• {x}</Text>
        </Card>
      ))}
      <Card>
        <Text style={s.label}>데이터 출처</Text>
        <Text style={s.body}>{brief?.dataSource.join(", ")}</Text>
      </Card>
    </Screen>
  );
}
function CaRecommendations() {
  return (
    <Screen title="CA PICK 추천" back>
      <Text style={s.body}>
        고객 선호와 상담 맥락을 토대로 제안할 제품 후보입니다.
      </Text>
      <ProductList products={MOCK_PRODUCTS.slice(0, 3)} />
    </Screen>
  );
}
function Consultation() {
  const n = useNavigation<any>();
  const [memo, setMemo] = useState("");
  return (
    <Screen title="오늘의 상담 기록" back>
      <Text style={s.label}>상담 메모</Text>
      <TextInput
        multiline
        value={memo}
        onChangeText={setMemo}
        placeholder="고객의 방문 목적과 반응을 기록하세요."
        style={[s.textInput, { height: 180, textAlignVertical: "top" }]}
      />
      <Button
        onPress={() => {
          Alert.alert("저장 완료", "상담 기록이 고객 이력에 저장되었습니다.");
          n.goBack();
        }}
      >
        상담 기록 저장
      </Button>
    </Screen>
  );
}
function IssueStamp() {
  const { customer, addStamp, currentStore } = useApp();
  const n = useNavigation<any>();
  return (
    <Screen title="방문 스탬프 발급" back>
      <Card dark>
        <Text style={s.darkKicker}>ISSUE JOURNEY STAMP</Text>
        <Text style={s.passportName}>{customer.name} 님</Text>
      </Card>
      <View style={s.issueStoreRow}>
        <Image source={STORE_STAMP_IMAGES[currentStore]} style={s.issueStoreStamp} />
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>ISSUING FROM</Text>
          <Text style={s.cardTitle}>{currentStore}</Text>
          <Text style={s.body}>이 지점의 도장으로 발급됩니다.</Text>
        </View>
      </View>
      <Text style={s.body}>고객의 방문을 확인한 뒤 여권에 도장을 발급합니다.</Text>
      <Button onPress={() => { addStamp(customer.id, "visit"); n.navigate("StampSuccess"); }} icon={<Stamp color={c.paper} size={22} />}>매장 방문 스탬프 발급</Button>
    </Screen>
  );
}
function Unregistered() {
  const n = useNavigation<any>();
  return (
    <Screen title="고객 확인" back>
      <Card>
        <Text style={s.pageTitle}>등록되지 않은 QR입니다</Text>
        <Text style={s.body}>
          고객 번호를 검색하거나 Private Circle 가입을 안내해 주세요.
        </Text>
      </Card>
      <Button secondary onPress={() => n.navigate("Search")}>
        고객 검색으로 이동
      </Button>
    </Screen>
  );
}
function StampSuccess() {
  const n = useNavigation<any>();
  return (
    <Screen title="스탬프 발급 완료" back>
      <Card dark>
        <Text style={s.darkKicker}>JOURNEY UPDATED</Text>
        <Text style={s.passportName}>스탬프가 발급되었습니다</Text>
        <Text style={s.darkBody}>
          고객의 Journey Passport에 바로 반영되었습니다.
        </Text>
      </Card>
      <Button onPress={() => n.navigate("CaHome")}>CA 홈으로</Button>
    </Screen>
  );
}

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
function CustomerTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: "#8A847C",
        tabBarStyle: { height: 64, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Recommendations") {
            return <Image source={RECOMMEND_ICON} style={{ width: size + 2, height: size + 2, tintColor: color }} resizeMode="contain" />;
          }
          const icons: any = {
            Home,
            Passport: BookOpen,
            Journey: MapPinned,
            Profile: UserRound,
          };
          const I = icons[route.name];
          return <I color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen
        name="Home"
        component={CustomerHome}
        options={{ title: "홈" }}
      />
      <Tabs.Screen
        name="Passport"
        component={Passport}
        options={{ title: "여권" }}
      />
      <Tabs.Screen
        name="Journey"
        component={Journey}
        options={{ title: "여정" }}
      />
      <Tabs.Screen
        name="Recommendations"
        component={Recommendations}
        options={{ title: "추천" }}
      />
      <Tabs.Screen
        name="Profile"
        component={Profile}
        options={{ title: "마이" }}
      />
    </Tabs.Navigator>
  );
}
function CustomerFlow() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="Benefits" component={Benefits} />
      <Stack.Screen name="Saved" component={Saved} />
    </Stack.Navigator>
  );
}
function CaFlow() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CaHome" component={CaHome} />
      <Stack.Screen name="Scanner" component={Scanner} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Unregistered" component={Unregistered} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetail} />
      <Stack.Screen name="Brief" component={Brief} />
      <Stack.Screen name="CaRecommendations" component={CaRecommendations} />
      <Stack.Screen name="Consultation" component={Consultation} />
      <Stack.Screen name="IssueStamp" component={IssueStamp} />
      <Stack.Screen name="StampSuccess" component={StampSuccess} />
    </Stack.Navigator>
  );
}
function Root() {
  const { role, isLoggedIn, authScreen } = useApp();
  return (
    <NavigationContainer>
      {!isLoggedIn ? (
        authScreen === "signup" ? (
          <SignUp />
        ) : (
          <Login />
        )
      ) : role === "customer" ? (
        <CustomerFlow />
      ) : (
        <CaFlow />
      )}
    </NavigationContainer>
  );
}
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <SafeAreaProvider>
      {showSplash ? (
        <Splash onComplete={() => setShowSplash(false)} />
      ) : (
        <Provider>
          <Root />
        </Provider>
      )}
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.bg },
  scrollOuter: { flexGrow: 1, alignItems: "center", paddingBottom: 18 },
  scroll: { width: "100%", padding: 20, gap: 24, paddingBottom: 20 },
  splash: { flex: 1, backgroundColor: "#12100E" },
  splashPress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  splashLogo: { width: "88%", maxWidth: 500, height: 178 },
  login: { backgroundColor: c.ink },
  loginTablet: { flexDirection: "row" },
  loginDark: { height: 348, flexGrow: 0, flexShrink: 0, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 26, backgroundColor: c.ink },
  loginDarkTablet: { flex: 0.42, height: undefined, padding: 48 },
  loginInner: { flex: 1, maxWidth: 460, alignSelf: "center", width: "100%", justifyContent: "flex-start" },
  loginLogo: { width: 272, height: 104, alignSelf: "flex-start", marginLeft: -18, marginTop: 7 },
  loginHeroSpacer: { height: 28 },
  loginForm: {
    flexGrow: 1,
    backgroundColor: c.paper,
    paddingVertical: 38,
    gap: 24,
  },
  loginFormTablet: {
    flex: 0.58,
    justifyContent: "center",
    paddingVertical: 58,
  },
  loginFormInner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    gap: 20,
  },
  authField: { gap: 11, marginTop: 5 },
  passwordField: { marginTop: 14 },
  loginButtonWrap: { marginTop: 28 },
  authTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  loginIntro: { marginBottom: 18 },
  roleSwitch: {
    minWidth: 58,
    height: 44,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    backgroundColor: c.paper,
  },
  roleSwitchActive: { backgroundColor: c.ink, borderColor: c.ink },
  roleSwitchText: { color: c.ink, fontWeight: "800", fontSize: 11 },
  roleSwitchTextActive: { color: c.paper },
  signupLink: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
  },
  signupText: { color: c.muted, fontSize: 13 },
  signupLinkText: { color: c.gold, fontSize: 13, fontWeight: "800" },
  signupOuter: { flexGrow: 1, alignItems: "center", padding: 24 },
  signupInner: { width: "100%", maxWidth: 560, gap: 18, paddingTop: 22 },
  backText: {
    alignSelf: "flex-start",
    minHeight: 52,
    justifyContent: "center",
  },
  logo: { color: c.paper, fontWeight: "900", fontSize: 32, letterSpacing: 6 },
  logoSub: {
    color: c.champagne,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 3,
  },
  logoSubGold: {
    color: c.gold,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
  },
  loginHeadline: {
    color: c.paper,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 33,
    marginTop: 32,
  },
  loginHeadlineTablet: { fontSize: 30, lineHeight: 40 },
  pageTitle: { color: c.ink, fontSize: 25, fontWeight: "800", lineHeight: 34 },
  body: { color: c.muted, fontSize: 14, lineHeight: 21 },
  darkBody: { color: "#D5D0C8", fontSize: 13, lineHeight: 20, marginTop: 6 },
  kicker: {
    color: c.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  loginKicker: { marginBottom: 12 },
  signupKicker: { color: c.gold, fontSize: 13, fontWeight: "800", letterSpacing: 1.25, marginBottom: -8 },
  profileKicker: { color: c.gold, fontSize: 14, fontWeight: "800", letterSpacing: 1.4, marginBottom: -12 },
  darkKicker: {
    color: c.champagne,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: c.line,
    paddingBottom: 14,
  },
  homeLogo: { width: 190, height: 76 },
  homeLogoPlate: { paddingHorizontal: 2, paddingVertical: 2, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  homeGreeting: { color: c.ink, fontSize: 25, fontWeight: "800", lineHeight: 32, marginTop: -10, marginBottom: -8 },
  brand: { color: c.ink, fontSize: 25, fontWeight: "900", letterSpacing: 4 },
  card: {
    backgroundColor: c.paper,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    gap: 12,
  },
  darkCard: { backgroundColor: c.ink, borderColor: "#4A4640" },
  passportName: {
    color: c.paper,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  stats: {
    flexDirection: "row",
    gap: 12,
    borderTopWidth: 1,
    borderColor: "#4A4640",
    paddingTop: 14,
    marginTop: 10,
  },
  caption: { color: c.muted, fontSize: 11 },
  statValue: { color: c.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  pillText: { fontWeight: "800", fontSize: 10 },
  button: {
    backgroundColor: c.ink,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  buttonSecondary: {
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { color: c.paper, fontSize: 14, fontWeight: "700" },
  buttonTextSecondary: { color: c.ink },
  logoutButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  logoutText: { color: c.wine, fontWeight: "800", fontSize: 14 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 18,
  },
  sectionTitle: { color: c.ink, fontSize: 18, fontWeight: "800" },
  link: { color: c.gold, fontSize: 14, fontWeight: "800" },
  sectionAction: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 1, justifyContent: "center" },
  stampPreview: { width: 132, alignItems: "center", gap: 7, paddingVertical: 6, paddingHorizontal: 5 },
  stampImage: { width: 94, height: 94 },
  stampFallback: { width: 94, height: 94, borderRadius: 47, borderWidth: 1.5, borderColor: c.wine, alignItems: "center", justifyContent: "center" },
  stampTitle: { color: c.ink, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 18, minHeight: 36 },
  stampDate: { color: c.wine, fontSize: 10, fontWeight: "700" },
  passportOwnerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 },
  passportQr: { width: 70, height: 70, borderRadius: 12, borderWidth: 1, borderColor: c.gold, alignItems: "center", justifyContent: "center" },
  passportStampGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 26, columnGap: 12, justifyContent: "center" },
  passportCardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  passportQrDark: { width: 62, height: 62, borderRadius: 10, borderWidth: 1, borderColor: c.gold, alignItems: "center", justifyContent: "center" },
  summaryTitle: { color: c.ink, fontSize: 20, fontWeight: "800", marginTop: 2, marginBottom: -10 },
  summaryRow: { flexDirection: "row", gap: 14, alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderColor: c.line },
  realQr: { alignItems: "center", paddingVertical: 20, backgroundColor: c.paper },
  productList: { gap: 12 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productGridItem: { width: "32%" },
  productCardTablet: { flexDirection: "column", alignItems: "stretch" },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
    backgroundColor: c.cloud,
  },
  productImageTablet: { width: "100%", height: 150 },
  cardTitle: { color: c.ink, fontSize: 15, fontWeight: "800" },
  price: { color: c.gold, fontSize: 13, fontWeight: "800", marginTop: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  quick: {
    width: "48%",
    minHeight: 104,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 8,
    padding: 16,
    gap: 9,
  },
  homeActionList: { gap: 12, marginTop: 2 },
  homeActionDark: { minHeight: 66, borderRadius: 8, backgroundColor: c.ink, paddingHorizontal: 18, flexDirection: "row", gap: 14, alignItems: "center" },
  homeActionDarkText: { flex: 1, color: c.paper, fontSize: 17, fontWeight: "800" },
  homeActionLight: { minHeight: 66, borderRadius: 8, backgroundColor: c.paper, borderWidth: 1, borderColor: c.line, paddingHorizontal: 18, flexDirection: "row", gap: 14, alignItems: "center" },
  homeActionLightText: { flex: 1, color: c.ink, fontSize: 17, fontWeight: "800" },
  caColumns: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  caMain: { flex: 1.15, gap: 16 },
  caSide: { flex: 0.85, gap: 16 },
  modal: {
    flex: 1,
    backgroundColor: "rgba(25,23,20,.78)",
    justifyContent: "center",
    padding: 22,
  },
  fakeQr: {
    height: 180,
    backgroundColor: c.ink,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  header: {
    height: 62,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: c.ink,
  },
  headerMark: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.darkPanel,
  },
  headerLogoMark: { width: 88, backgroundColor: "transparent" },
  headerLogo: { width: 86, height: 36 },
  headerMarkText: { color: c.champagne, fontWeight: "900", fontSize: 30, lineHeight: 34 },
  headerKicker: {
    color: c.champagne,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  headerTitle: { color: c.paper, fontSize: 16, fontWeight: "800" },
  segment: {
    flexDirection: "row",
    backgroundColor: "#ECEAE6",
    padding: 4,
    borderRadius: 8,
  },
  segmentItem: { flex: 1, paddingVertical: 13, alignItems: "center", borderRadius: 6 },
  segmentActive: { backgroundColor: c.paper },
  label: { color: c.ink, fontSize: 12, fontWeight: "800", marginTop: 4 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#FAFAF8",
  },
  demo: { color: c.muted, fontSize: 12, textAlign: "center" },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.cloud },
  scanner: {
    minHeight: 280,
    backgroundColor: c.ink,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    gap: 16,
  },
  textInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 8,
    backgroundColor: c.paper,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: c.ink,
  },
  profilePassportTop: { flexDirection: "row", alignItems: "center", gap: 16, position: "relative", paddingRight: 48 },
  profilePhotoFrame: { width: 82, height: 102, borderWidth: 1, borderColor: c.champagne, padding: 5 },
  profilePhoto: { width: "100%", height: "100%", resizeMode: "cover" },
  photoEdit: { position: "absolute", right: 3, bottom: 3, backgroundColor: c.ink, paddingHorizontal: 5, paddingVertical: 3 },
  photoEditText: { color: c.paper, fontSize: 9, fontWeight: "800" },
  profileVip: { position: "absolute", right: 0, top: 0 },
  journeyDescription: { color: c.muted, fontSize: 14, lineHeight: 21, marginTop: -14 },
  recommendationDescription: { color: c.muted, fontSize: 14, lineHeight: 21, marginTop: -14 },
  journeyTimeline: { paddingTop: 4, gap: 0 },
  journeyStop: { minHeight: 128, flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 8 },
  journeyRail: { position: "absolute", left: 55, top: 105, bottom: -23, width: 1.5, backgroundColor: c.line },
  journeyStampImage: { width: 94, height: 94, zIndex: 1 },
  journeyDot: { width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, borderColor: c.wine, alignItems: "center", justifyContent: "center", zIndex: 1 },
  journeyCopy: { flex: 1, gap: 3 },
  journeyMonth: { color: c.gold, fontSize: 11, fontWeight: "800" },
  recordList: { gap: 14 },
  recordImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: c.cloud },
  recordMeta: { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, borderColor: c.line, paddingTop: 12, marginTop: 4 },
  storePicker: { gap: 10, paddingTop: 4 },
  storeOption: { width: 110, minHeight: 132, alignItems: "center", justifyContent: "center", gap: 7, padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: "#FCFAF7" },
  storeOptionActive: { borderColor: c.gold, backgroundColor: "#F7EFD9" },
  storeOptionStamp: { width: 60, height: 60 },
  storeOptionText: { color: c.muted, fontSize: 10, fontWeight: "700", textAlign: "center", lineHeight: 14 },
  storeOptionTextActive: { color: c.ink },
  issueStoreRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: "#FCFAF7" },
  issueStoreStamp: { width: 76, height: 76 },
  emptyJourney: { alignItems: "center", paddingVertical: 42, gap: 18 },
  emptyJourneyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#E4EEEA" },
  emptyJourneyTitle: { color: c.ink, fontSize: 26, fontWeight: "800" },
  emptyJourneyBody: { color: c.muted, fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 10 },
  caDashboardTop: { gap: 16 },
  caDashboardTopTablet: { flexDirection: "row", alignItems: "stretch" },
  caScanHero: { flex: 1, minHeight: 236, padding: 28, backgroundColor: c.ink, justifyContent: "space-between", borderRadius: 8, flexDirection: "row", alignItems: "flex-start" },
  caScanIcon: { width: 76, height: 76, borderRadius: 14, backgroundColor: c.paper, alignItems: "center", justifyContent: "center" },
  caSearchBox: { flex: 0.85, minHeight: 236, padding: 24, borderWidth: 1, borderColor: c.line, borderRadius: 8, gap: 18, backgroundColor: c.paper },
  caSearchTitle: { flexDirection: "row", alignItems: "center", gap: 12 },
  cameraPermission: { alignItems: "center", justifyContent: "center", minHeight: 420, gap: 18, padding: 28 },
  cameraFrame: { height: 360, borderRadius: 12, overflow: "hidden", backgroundColor: c.ink },
  camera: { flex: 1 },
  cameraGuide: { position: "absolute", width: "68%", aspectRatio: 1, alignSelf: "center", top: "16%", borderWidth: 2, borderColor: c.champagne, borderRadius: 12 },
  cautionCard: { backgroundColor: "#F8EDEF", borderWidth: 1, borderColor: "#D7A9AF", borderRadius: 8, padding: 20, gap: 12 },
});
