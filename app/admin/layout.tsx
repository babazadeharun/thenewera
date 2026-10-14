import WorkspaceLayout from '../components-workspace/WorkspaceLayout';
export default function Layout({children}:{children:React.ReactNode}){return <WorkspaceLayout allowed={["ADMIN", "SUPER_ADMIN", "EVENTS_ADMIN", "EVENTS_FINANCE"]}>{children}</WorkspaceLayout>}
