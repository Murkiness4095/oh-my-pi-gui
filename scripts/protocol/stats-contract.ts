/** Compile-time contracts: each stats HTTP reply must satisfy the GUI type that reads it. */
import type * as Server from "../../../stats/src/types";
import type * as Gui from "../../src/shared/stats-types";

type Wire<T> = T extends string ? `${T}` : T extends object ? { [K in keyof T]: Wire<T[K]> } : T;
type Accepts<Consumer, Producer extends Consumer> = Producer;

export type Overview = Accepts<
	Gui.OverviewData,
	Wire<Pick<Server.DashboardStats, "overall" | "byAgentType" | "timeSeries">>
>;
export type Models = Accepts<
	Gui.ModelsData,
	Wire<Pick<Server.DashboardStats, "byModel" | "modelSeries" | "modelPerformanceSeries">>
>;
export type Costs = Accepts<Gui.CostsData, Wire<Pick<Server.DashboardStats, "costSeries">>>;
export type Tools = Accepts<Gui.ToolsData, Wire<Server.ToolDashboardStats>>;
export type Providers = Accepts<Gui.ProvidersData, Wire<Server.ProviderDashboardStats>>;
export type ProviderWindows = Accepts<Gui.ProviderWindowsData, Wire<Server.ProviderWindowStats>>;
export type Errors = Accepts<Gui.ErrorRow, Wire<Server.MessageStats>>;
export type Folders = Accepts<Gui.FolderRow, Wire<Server.FolderStats>>;
export type Gain = Accepts<Gui.GainData, Wire<Server.GainDashboardStats>>;
export type Requests = Accepts<Gui.RequestPage, Wire<Server.RequestPage>>;
export type RequestDetail = Accepts<Gui.RequestDetail, Wire<Server.RequestDetails>>;
export type Frustration = Accepts<Gui.FrustrationData, Wire<Server.FrustrationDashboardStats>>;
export type Status = Accepts<Gui.LiveStatus, Wire<Server.LiveStatus>>;
