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
  addStamp: (id: string, type: JourneyStamp["type"]) => void;
};
const Ctx = createContext<AppState | null>(null);
const useApp = () => useContext(Ctx)!;
const storageKey = "mcm-mobile-customers";

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
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((v) => v && setCustomers(JSON.parse(v)))
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
                      storeName: "MCM 청담 플래그십",
                      issuedAt: new Date().toISOString(),
                      issuedByCA: "이현우 CA",
                    },
                    ...x.stamps,
                  ],
                },
          ),
        ),
    }),
    [role, isLoggedIn, authScreen, customers, selected],
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
        style={s.headerMark}
      >
        <Text style={s.headerMarkText}>{back ? "‹" : "MCM"}</Text>
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
          <Text style={s.logo}>MCM</Text>
          <Text style={s.logoSub}>PRIVATE CIRCLE</Text>
          <View style={{ flex: 1 }} />
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
              <Text style={s.kicker}>
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
          <Text style={s.body}>
            {isCustomer
              ? "MCM Private Circle 고객 계정으로 로그인하세요."
              : "매장 담당자 전용 로그인입니다."}
          </Text>
          <Text style={s.label}>
            {isCustomer ? "이메일 또는 휴대폰 번호" : "담당 CA 사번"}
          </Text>
          <TextInput
            style={s.textInput}
            placeholder={isCustomer ? "example@email.com" : "CA-1092"}
            placeholderTextColor={c.muted}
            autoCapitalize="none"
          />
          <Text style={s.label}>비밀번호</Text>
          <TextInput
            style={s.textInput}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor={c.muted}
            secureTextEntry
          />
          <Button
            onPress={enter}
            icon={<ChevronRight color={c.paper} size={18} />}
          >
            {isCustomer ? "로그인하고 여권 보기" : "CA Workstation 시작"}
          </Button>
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
          <Text style={s.kicker}>PRIVATE CIRCLE MEMBERSHIP</Text>
          <Text style={s.pageTitle}>회원가입</Text>
          <Text style={s.body}>
            MCM의 특별한 여정을 시작하기 위한 기본 정보를 입력해 주세요.
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
              가입 후 매장 방문, 스탬프, 케어 이력을 Journey Passport에서 관리할
              수 있습니다.
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
        <View style={s.splashMark}>
          <Text style={s.splashM}>M</Text>
        </View>
        <View style={s.splashLine} />
        <Text style={s.splashTitle}>PRIVATE CIRCLE</Text>
        <Text style={s.splashSub}>JOURNEY PASSPORT</Text>
        <Text style={s.splashHint}>화면을 누르면 바로 시작합니다</Text>
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
        <View>
          <Text style={s.brand}>MCM</Text>
          <Text style={s.logoSubGold}>PRIVATE CIRCLE</Text>
        </View>
        {isVip && <Pill tone="wine">VIP</Pill>}
      </View>
      <Text style={s.kicker}>MCM JOURNEY PASSPORT</Text>
      <Text style={s.pageTitle}>안녕하세요, {customer.name} 님</Text>
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
          <Stat
            dark
            label="리워드 포인트"
            value={`${customer.points.toLocaleString()} P`}
          />
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
      <SectionTitle
        title="고객 맞춤 보조 큐레이션"
        action={() => n.navigate("Recommendations")}
      />
      <ProductList products={MOCK_PRODUCTS.slice(0, 3)} />
      <View style={s.grid}>
        <Quick
          icon={<MapPinned color={c.gold} />}
          title="나의 여정 이력"
          onPress={() => n.navigate("Journey")}
        />
        <Quick
          icon={<Award color={c.gold} />}
          title="멤버십 혜택"
          onPress={() => n.navigate("Benefits")}
        />
        <Quick
          icon={<Heart color={c.gold} />}
          title="관심 저장 제품"
          onPress={() => n.navigate("Saved")}
        />
        <Quick
          icon={<UserRound color={c.gold} />}
          title="나의 여권"
          onPress={() => n.navigate("Profile")}
        />
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
              <QrCode size={132} color={c.paper} />
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
        <Pressable onPress={action}>
          <Text style={s.link}>전체 보기 ›</Text>
        </Pressable>
      )}
    </View>
  );
}
function StampCard({ item }: { item: JourneyStamp }) {
  const asset = STORE_STAMP_IMAGES[item.storeName];
  return (
    <View style={s.stampPreview}>
      {asset ? (
        <Image source={asset} style={s.stampImage} resizeMode="contain" />
      ) : (
        <View style={s.stampFallback}>
          <Stamp color={c.wine} size={24} />
        </View>
      )}
      <Text numberOfLines={1} style={s.stampTitle}>
        {item.storeName}
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
  return (
    <Screen title="Journey Passport" back>
      <Card dark>
        <Text style={s.darkKicker}>OFFICIAL DIGITAL PASSPORT</Text>
        <Text style={s.passportName}>{customer.name}</Text>
        <Text style={s.darkBody}>MEMBER NO. {customer.customerNo}</Text>
        <View style={s.stats}>
          <Stat dark label="MEMBERSHIP" value={customer.membershipTier} />
          <Stat
            dark
            label="POINTS"
            value={`${customer.points.toLocaleString()} P`}
          />
        </View>
      </Card>
      <View style={s.passportOwnerRow}>
        <View>
          <Text style={s.kicker}>PASSPORT HOLDER</Text>
          <Text style={s.cardTitle}>{customer.name}</Text>
          <Text style={s.body}>발급일 · {customer.joinedAt}</Text>
        </View>
        <View style={s.passportSeal}>
          <Text style={s.passportSealText}>M</Text>
        </View>
      </View>
      <SectionTitle title="나의 국내 방문 도장" />
      <View style={s.passportStampGrid}>
        {customer.stamps.map((x) => (
          <StampCard key={x.id} item={x} />
        ))}
      </View>
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
      <Text style={s.body}>방문, 구매, 케어의 순간을 여권처럼 모았습니다.</Text>
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
      {tab === "stamps" ? (
        <View style={s.journeyTimeline}>
          {customer.stamps.map((x) => {
            const asset = STORE_STAMP_IMAGES[x.storeName];
            return (
              <View key={x.id} style={s.journeyStop}>
                <View style={s.journeyRail} />
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
              <View style={s.recordMeta}><CalendarDays size={15} color={c.gold} /><Text style={s.caption}>구매 · {purchase.purchasedAt}</Text></View>
            </Card>
          ))}
          {customer.careRecords.map((record) => (
            <Card key={record.id}>
              <Text style={s.kicker}>CARE NOTE</Text>
              <Text style={s.cardTitle}>{record.type}</Text>
              <Text style={s.body}>{record.note}</Text>
              <Text style={s.caption}>{record.date}</Text>
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
      <Text style={s.pageTitle}>고객 맞춤 보조 큐레이션</Text>
      <Text style={s.body}>
        선호와 여정 기록을 바탕으로 CA가 참고할 제품입니다.
      </Text>
      <ProductList products={MOCK_PRODUCTS} />
    </Screen>
  );
}
function Profile() {
  const { customer, logout } = useApp();
  const n = useNavigation<any>();
  return (
    <Screen>
      <Text style={s.kicker}>MY PASSPORT</Text>
      <Text style={s.pageTitle}>나의 여권</Text>
      <Card dark>
        <View style={s.profilePassportTop}>
          <View style={s.profilePhotoFrame}>
            <Image source={{ uri: customer.avatarUrl }} style={s.profilePhoto} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.darkKicker}>PASSPORT HOLDER</Text>
            <Text style={s.passportName}>{customer.name}</Text>
            <Text style={s.darkBody}>MEMBER NO. {customer.customerNo}</Text>
            {customer.membershipTier === "VIP" && <Pill tone="wine">VIP</Pill>}
          </View>
        </View>
        <View style={s.stats}>
          <Stat dark label="국내 방문" value={`${customer.stamps.length}곳`} />
          <Stat dark label="포인트" value={`${customer.points.toLocaleString()} P`} />
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
        <LogOut color={c.wine} size={18} />
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
  const { customers, select, setRole, logout } = useApp();
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
      <Card dark>
        <Text style={s.darkKicker}>TODAY'S CLIENTELING</Text>
        <Text style={s.passportName}>안녕하세요, 이현우 CA님</Text>
        <Text style={s.darkBody}>
          고객의 맥락을 먼저 확인하고 자연스럽게 응대하세요.
        </Text>
      </Card>
      <View style={s.grid}>
        <Quick
          icon={<ScanLine color={c.gold} />}
          title="QR 스캔"
          onPress={() => n.navigate("Scanner")}
        />
        <Quick
          icon={<Search color={c.gold} />}
          title="고객 검색"
          onPress={() => n.navigate("Search")}
        />
      </View>
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
            <Button secondary onPress={() => setRole("customer")}>
              고객 앱으로 전환
            </Button>
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
          <Button secondary onPress={() => setRole("customer")}>
            고객 앱으로 전환
          </Button>
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
  return (
    <Screen title="QR 스캐너" back>
      <View style={s.scanner}>
        <ScanLine size={74} color={c.champagne} />
        <Text style={s.darkBody}>카메라 권한 연결 후 QR을 스캔합니다</Text>
      </View>
      <Text style={s.body}>
        데모에서는 현재 고객 QR을 인식하는 흐름을 제공합니다.
      </Text>
      <Button onPress={() => n.navigate("CustomerDetail", { id: customer.id })}>
        김민준 고객 QR 인식
      </Button>
      <Button secondary onPress={() => n.navigate("Unregistered")}>
        미등록 고객 안내
      </Button>
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
          <Stat
            dark
            label="포인트"
            value={`${customer.points.toLocaleString()}P`}
          />
        </View>
      </Card>
      <View style={s.grid}>
        <Quick
          icon={<Sparkles color={c.gold} />}
          title="AI 브리프"
          onPress={() => n.navigate("Brief")}
        />
        <Quick
          icon={<FileText color={c.gold} />}
          title="상담 기록"
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
        <Card>
          <Text style={[s.cardTitle, { color: c.wine }]}>
            CA 전용 응대 주의사항
          </Text>
          <Text style={s.body}>{customer.cautionNotes}</Text>
        </Card>
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
    <Screen title="AI 응대 브리프" back>
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
    <Screen title="상담 기록 작성" back>
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
  const { customer, addStamp } = useApp();
  const n = useNavigation<any>();
  return (
    <Screen title="방문 스탬프 발급" back>
      <Card dark>
        <Text style={s.darkKicker}>ISSUE JOURNEY STAMP</Text>
        <Text style={s.passportName}>{customer.name} 님</Text>
      </Card>
      <Text style={s.body}>발급할 여정 유형을 선택하세요.</Text>
      {(["visit", "purchase", "care"] as const).map((type) => (
        <Button
          key={type}
          secondary
          onPress={() => {
            addStamp(customer.id, type);
            n.navigate("StampSuccess");
          }}
          icon={<Stamp color={c.ink} size={18} />}
        >
          {type === "visit"
            ? "매장 방문"
            : type === "purchase"
              ? "제품 구매"
              : "제품 케어"}{" "}
          스탬프 발급
        </Button>
      ))}
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
          const icons: any = {
            Home,
            Passport: BookOpen,
            Journey: MapPinned,
            Recommendations: Sparkles,
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
  scrollOuter: { flexGrow: 1, alignItems: "center", paddingBottom: 42 },
  scroll: { width: "100%", padding: 20, gap: 22, paddingBottom: 42 },
  splash: { flex: 1, backgroundColor: "#12100E" },
  splashPress: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  splashMark: {
    width: 116,
    height: 116,
    borderWidth: 1,
    borderColor: c.champagne,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  splashM: {
    color: c.paper,
    fontSize: 56,
    fontWeight: "700",
    letterSpacing: 2,
  },
  splashLine: {
    width: 170,
    height: 1,
    backgroundColor: c.gold,
    marginTop: 30,
    marginBottom: 18,
  },
  splashTitle: {
    color: c.paper,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 3,
  },
  splashSub: {
    color: c.champagne,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 12,
  },
  splashHint: {
    position: "absolute",
    bottom: 56,
    color: "#938B81",
    fontSize: 12,
  },
  login: { backgroundColor: c.ink },
  loginTablet: { flexDirection: "row" },
  loginDark: { flex: 1, padding: 28, backgroundColor: c.ink },
  loginDarkTablet: { flex: 0.42, padding: 48 },
  loginInner: { flex: 1, maxWidth: 460, alignSelf: "center", width: "100%" },
  loginForm: {
    flexGrow: 1,
    backgroundColor: c.paper,
    paddingVertical: 24,
    gap: 14,
  },
  loginFormTablet: {
    flex: 0.58,
    justifyContent: "center",
    paddingVertical: 48,
  },
  loginFormInner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    gap: 14,
  },
  authTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
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
    paddingVertical: 8,
  },
  signupText: { color: c.muted, fontSize: 13 },
  signupLinkText: { color: c.gold, fontSize: 13, fontWeight: "800" },
  signupOuter: { flexGrow: 1, alignItems: "center", padding: 24 },
  signupInner: { width: "100%", maxWidth: 560, gap: 16, paddingTop: 22 },
  backText: {
    alignSelf: "flex-start",
    minHeight: 40,
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
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 35,
    marginTop: 16,
  },
  loginHeadlineTablet: { fontSize: 32, lineHeight: 42 },
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
    paddingBottom: 12,
  },
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
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E7C6C8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#FCF5F5",
  },
  logoutText: { color: c.wine, fontWeight: "800", fontSize: 14 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sectionTitle: { color: c.ink, fontSize: 18, fontWeight: "800" },
  link: { color: c.gold, fontSize: 12, fontWeight: "800" },
  stampPreview: { width: 132, alignItems: "center", gap: 7, paddingVertical: 4 },
  stampImage: { width: 78, height: 78 },
  stampFallback: { width: 78, height: 78, borderRadius: 39, borderWidth: 1.5, borderColor: c.wine, alignItems: "center", justifyContent: "center" },
  stampTitle: { color: c.ink, fontSize: 12, fontWeight: "700" },
  stampDate: { color: c.wine, fontSize: 10, fontWeight: "700" },
  passportOwnerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 },
  passportSeal: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: c.gold, alignItems: "center", justifyContent: "center" },
  passportSealText: { color: c.gold, fontSize: 34, fontWeight: "800" },
  passportStampGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 24, justifyContent: "space-around" },
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
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: c.darkPanel,
  },
  headerMarkText: { color: c.champagne, fontWeight: "900", fontSize: 12 },
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
    minHeight: 50,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 8,
    backgroundColor: c.paper,
    padding: 14,
    fontSize: 14,
    color: c.ink,
  },
  profilePassportTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  profilePhotoFrame: { width: 82, height: 102, borderWidth: 1, borderColor: c.champagne, padding: 5 },
  profilePhoto: { width: "100%", height: "100%", resizeMode: "cover" },
  journeyTimeline: { paddingTop: 4, gap: 0 },
  journeyStop: { minHeight: 116, flexDirection: "row", alignItems: "center", gap: 16, paddingLeft: 8 },
  journeyRail: { position: "absolute", left: 49, top: 72, bottom: -2, width: 1, backgroundColor: c.line },
  journeyStampImage: { width: 82, height: 82, zIndex: 1 },
  journeyDot: { width: 82, height: 82, borderRadius: 41, borderWidth: 1.5, borderColor: c.wine, alignItems: "center", justifyContent: "center", zIndex: 1 },
  journeyCopy: { flex: 1, gap: 3 },
  journeyMonth: { color: c.gold, fontSize: 11, fontWeight: "800" },
  recordList: { gap: 14 },
  recordImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: c.cloud },
  recordMeta: { flexDirection: "row", alignItems: "center", gap: 7, borderTopWidth: 1, borderColor: c.line, paddingTop: 12, marginTop: 4 },
});
