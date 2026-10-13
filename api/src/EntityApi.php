<?php
declare(strict_types=1);

/** Compatibility REST surface for the ARQv2 Base44 entity calls. */
function arq_entity_definitions(): array
{
    $commonDate = ['created_date'=>['created_date','date'],'updated_date'=>['updated_date','date']];
    return [
        'Tenant'=>['table'=>'tenants','scope'=>'tenant','fields'=>['id'=>['id','string'],'name'=>['name','string'],'code'=>['code','string'],'owner_name'=>['owner_name','string'],'contact_phone'=>['contact_phone','string'],'contact_email'=>['contact_email','string'],'address'=>['address','string'],'currency'=>['currency','string'],'status'=>['status','enum',['active','trial','suspended']],'plan'=>['plan','enum',['starter','business','enterprise']],'commission_enabled'=>['commission_enabled','bool'],'default_commission_rate'=>['default_commission_rate','number'],'hotspot_portal_url'=>['hotspot_portal_url','string'],'hotspot_dns_name'=>['hotspot_dns_name','string'],'default_voucher_expiry_hours'=>['default_voucher_expiry_hours','number'],'notes'=>['notes','string'],'created_date'=>['created_date','date'],'updated_date'=>['updated_date','date']],'required'=>['name','code']],
        'TenantMember'=>['table'=>'tenant_memberships','scope'=>'membership','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'name'=>['name','string'],'email'=>['email','string'],'phone'=>['phone','string'],'app_role'=>['app_role','enum',['owner_admin','admin','reseller','technician','customer']],'customer_id'=>['customer_id','string'],'commission_rate'=>['commission_rate','number'],'status'=>['status','enum',['invited','active','suspended']],'invited_by_name'=>['invited_by_name','string'],'joined_date'=>['joined_date','date'],'notes'=>['notes','string'],'created_date'=>['created_at','date'],'updated_date'=>['updated_at','date']],'required'=>['tenant_id','email','app_role']],
        'Package'=>['table'=>'packages','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'name'=>['name','string'],'service_type'=>['service_type','enum',['hotspot','pppoe']],'speed_mbps'=>['speed_mbps','number'],'price'=>['price','number'],'cost'=>['cost','number'],'duration_hours'=>['duration_hours','number'],'quota_label'=>['quota_label','string'],'description'=>['description','string'],'status'=>['status','enum',['active','inactive']],...$commonDate],'required'=>['tenant_id','name','price']],
        'Customer'=>['table'=>'customers','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'name'=>['name','string'],'customer_code'=>['customer_code','string'],'email'=>['email','string'],'phone'=>['phone','string'],'address'=>['address','string'],'package_id'=>['package_id','string'],'package_name'=>['package_name','string'],'service_type'=>['service_type','enum',['hotspot','pppoe']],'monthly_fee'=>['monthly_fee','number'],'status'=>['status','enum',['active','suspended','isolated','terminated']],'install_date'=>['install_date','date'],'notes'=>['notes','string'],...$commonDate],'required'=>['tenant_id','name']],
        'VoucherBatch'=>['table'=>'voucher_batches','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'package_id'=>['package_id','string'],'package_name'=>['package_name','string'],'name'=>['name','string'],'quantity'=>['quantity','number'],'prefix'=>['prefix','string'],'code_length'=>['code_length','number'],'price'=>['price','number'],'cost'=>['cost','number'],'expiry_hours'=>['expiry_hours','number'],'created_by_name'=>['created_by_name','string'],'note'=>['note','string'],'status'=>['status','enum',['active','closed']],...$commonDate],'required'=>['tenant_id','package_id','quantity']],
        'Voucher'=>['table'=>'vouchers','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'batch_id'=>['batch_id','string'],'package_id'=>['package_id','string'],'package_name'=>['package_name','string'],'code'=>['code','string'],'price'=>['price','number'],'cost'=>['cost','number'],'status'=>['status','enum',['available','allocated','sold','void']],'reseller_id'=>['reseller_id','string'],'reseller_name'=>['reseller_name','string'],'sold_price'=>['sold_price','number'],'commission_amount'=>['commission_amount','number'],'sold_date'=>['sold_date','date'],'expiry_date'=>['expiry_date','date'],'note'=>['note','string'],...$commonDate],'required'=>['tenant_id','code','package_id']],
        'ResellerStock'=>['table'=>'reseller_stocks','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'reseller_id'=>['reseller_id','string'],'reseller_name'=>['reseller_name','string'],'package_id'=>['package_id','string'],'package_name'=>['package_name','string'],'quantity_in'=>['quantity_in','number'],'quantity_sold'=>['quantity_sold','number'],'quantity_returned'=>['quantity_returned','number'],'quantity_remaining'=>['quantity_remaining','number'],'price'=>['price','number'],'commission_rate'=>['commission_rate','number'],'last_mutation_date'=>['last_mutation_date','date'],...$commonDate],'required'=>['tenant_id','reseller_id','package_id']],
        'StockMutation'=>['table'=>'stock_mutations','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'reseller_id'=>['reseller_id','string'],'reseller_name'=>['reseller_name','string'],'package_id'=>['package_id','string'],'package_name'=>['package_name','string'],'type'=>['type','enum',['allocation','sale','return','void']],'quantity'=>['quantity','number'],'unit_price'=>['unit_price','number'],'amount'=>['amount','number'],'actor_name'=>['actor_name','string'],'note'=>['note','string'],...$commonDate],'required'=>['tenant_id','reseller_id','type','quantity']],
        'Invoice'=>['table'=>'invoices','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'customer_id'=>['customer_id','string'],'customer_name'=>['customer_name','string'],'invoice_number'=>['invoice_number','string'],'period'=>['period','string'],'amount'=>['amount','number'],'discount'=>['discount','number'],'total'=>['total','number'],'status'=>['status','enum',['unpaid','paid','overdue','void']],'issue_date'=>['issue_date','date'],'due_date'=>['due_date','date'],'paid_date'=>['paid_date','date'],'payment_method'=>['payment_method','enum',['cash','transfer','qris','other']],'notes'=>['notes','string'],...$commonDate],'required'=>['tenant_id','customer_id','invoice_number','total']],
        'Ticket'=>['table'=>'tickets','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'customer_id'=>['customer_id','string'],'customer_name'=>['customer_name','string'],'ticket_number'=>['ticket_number','string'],'title'=>['title','string'],'description'=>['description','string'],'category'=>['category','enum',['gangguan','instalasi','perangkat','tagihan','lainnya']],'priority'=>['priority','enum',['low','medium','high','urgent']],'status'=>['status','enum',['open','in_progress','waiting','resolved','closed']],'assigned_to'=>['assigned_to','string'],'assigned_to_name'=>['assigned_to_name','string'],'resolution_note'=>['resolution_note','string'],'resolved_date'=>['resolved_date','date'],'created_by_name'=>['created_by_name','string'],...$commonDate],'required'=>['tenant_id','title','status']],
        'Finance'=>['table'=>'finances','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'type'=>['type','enum',['income','expense']],'category'=>['category','string'],'amount'=>['amount','number'],'description'=>['description','string'],'reference'=>['reference','string'],'date'=>['entry_date','date'],'actor_name'=>['actor_name','string'],...$commonDate],'required'=>['tenant_id','type','amount']],
        'ActivityLog'=>['table'=>'activity_logs','scope'=>'tenant','fields'=>['id'=>['id','string'],'tenant_id'=>['tenant_id','string'],'actor_name'=>['actor_name','string'],'action'=>['action','string'],'entity'=>['entity','string'],'entity_id'=>['entity_id','string'],'description'=>['description','string'],...$commonDate],'required'=>['tenant_id','action']],
    ];
}

function arq_entity_context(array $account): array
{
    $q = db()->prepare("SELECT m.id AS member_id,m.tenant_id,m.customer_id,m.app_role FROM tenant_memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.account_id=? AND m.status='active' AND t.status<>'suspended'");
    $q->execute([$account['id']]);
    $memberships = $q->fetchAll();
    $byTenant = [];
    foreach ($memberships as $member) $byTenant[$member['tenant_id']] = $member;
    return ['platform_admin'=>$account['platform_role']==='admin','account_name'=>$account['full_name'],'memberships'=>$memberships,'by_tenant'=>$byTenant,'tenant_ids'=>array_keys($byTenant)];
}

function arq_entity_error(string $message, int $status): never { respond(['error'=>$message],$status); }

function arq_entity_scope(array $meta, array $context, array &$params, string $alias = ''): string
{
    $prefix = $alias === '' ? '' : $alias . '.';
    if (($meta['name'] ?? '') === 'Tenant') {
        if ($context['platform_admin']) return '1=1';
        if (!$context['tenant_ids']) arq_entity_error('Tidak ada keanggotaan aktif.',403);
        $params = [...$params,...$context['tenant_ids']];
        return $prefix . 'id IN (' . implode(',',array_fill(0,count($context['tenant_ids']),'?')) . ')';
    }
    if ($meta['scope'] === 'tenant') {
        if ($context['platform_admin']) return '1=1';
        if (!$context['tenant_ids']) arq_entity_error('Tidak ada keanggotaan aktif.',403);
        $params = [...$params,...$context['tenant_ids']];
        return $prefix . 'tenant_id IN (' . implode(',',array_fill(0,count($context['tenant_ids']),'?')) . ')';
    }
    if ($meta['scope'] === 'membership') {
        if ($context['platform_admin']) return '1=1';
        if (!$context['tenant_ids']) arq_entity_error('Tidak ada keanggotaan aktif.',403);
        $params = [...$params,...$context['tenant_ids']];
        return $prefix . 'tenant_id IN (' . implode(',',array_fill(0,count($context['tenant_ids']),'?')) . ')';
    }
    return '1=1';
}

function arq_entity_role_allowed(string $entity, string $action, ?string $role, bool $platformAdmin): bool
{
    if ($entity==='TenantMember' && $action!=='read') return false;
    if ($entity==='Tenant' && $action==='delete') return false;
    if ($platformAdmin) return true;
    if (!$role) return false;
    if ($entity==='Tenant' && in_array($action,['create','delete'],true)) return false;
    if (in_array($role,['owner_admin','admin'],true)) {
        if (in_array($entity,['ActivityLog','StockMutation'],true)) return $action==='read' || $action==='create';
        return true;
    }
    if ($role==='reseller') return match($entity) {
        'Package','TenantMember' => $action==='read',
        'Voucher' => in_array($action,['read','update'],true),
        'ResellerStock' => in_array($action,['read','create','update'],true),
        'StockMutation','ActivityLog' => $action==='read' || $action==='create',
        default => false,
    };
    if ($role==='technician') return match($entity) {
        'Ticket' => in_array($action,['read','create','update'],true),
        'TenantMember','Customer','Package' => $action==='read',
        'ActivityLog' => $action==='create',
        default => false,
    };
    if ($role==='customer') return match($entity) {
        'Invoice','Customer','Ticket' => $action==='read' || ($entity==='Ticket' && $action==='create'),
        'Package' => $action==='read',
        default => false,
    };
    return false;
}

function arq_entity_field_sql(array $definition, string $field, string $alias = ''): string
{
    if (!isset($definition['fields'][$field])) arq_entity_error('Filter atau kolom tidak didukung.',422);
    [$column] = $definition['fields'][$field];
    $prefix = $alias === '' ? '' : $alias . '.';
    return $prefix . '`' . $column . '`';
}

function arq_entity_filter_sql(array $definition, array $filter, array $context, array &$params, string $alias = ''): string
{
    $clauses=[];
    foreach ($filter as $field=>$condition) {
        $column=arq_entity_field_sql($definition,(string)$field,$alias);
        if (is_array($condition)) {
            foreach ($condition as $operator=>$value) {
                if ($operator==='$options') continue;
                if ($operator==='$regex') {
                    if (!is_string($value)||strlen($value)>100) arq_entity_error('Pola pencarian tidak valid.',422);
                    $clauses[]=$column.' LIKE ?'; $params[]='%'.str_replace(['\\','%','_'],['\\\\','\\%','\\_'],$value).'%'; continue;
                }
                if ($operator==='$in') {
                    if (!is_array($value)||count($value)>500) arq_entity_error('Filter daftar tidak valid.',422);
                    if (!$value) { $clauses[]='1=0'; continue; }
                    $clauses[]=$column.' IN ('.implode(',',array_fill(0,count($value),'?')).')'; array_push($params,...array_values($value)); continue;
                }
                $op=match($operator){'$eq'=>'=','$ne'=>'<>','$gt'=>'>','$gte'=>'>=','$lt'=>'<','$lte'=>'<=',default=>null};
                if ($op===null) arq_entity_error('Operator filter tidak didukung.',422);
                if ($value===null && in_array($op,['=','<>'],true)) { $clauses[]=$column.($op==='='?' IS NULL':' IS NOT NULL'); continue; }
                $clauses[]=$column.' '.$op.' ?'; $params[]=$value;
            }
        } else if ($condition===null) $clauses[]=$column.' IS NULL';
        else { $clauses[]=$column.' = ?'; $params[]=$condition; }
    }

    $scopeParams=[]; $scope=arq_entity_scope($definition,$context,$scopeParams,$alias); array_push($params,...$scopeParams); $clauses[]=$scope;
    $entity=$definition['name']??'';
    $roleConditions=[];
    foreach ($context['memberships'] as $member) {
        $role=$member['app_role']; $tenant=(string)$member['tenant_id']; $memberId=(string)$member['member_id']; $customerId=(string)($member['customer_id']??'');
        $tenantColumn=$entity==='Tenant'?'id':'tenant_id';
        if (in_array($role,['owner_admin','admin'],true)) { $roleConditions[]='('.$tenantColumn.' = ?)'; $params[]=$tenant; continue; }
        if ($role==='customer') {
            if (in_array($entity,['Invoice','Ticket'],true)) { $roleConditions[]='(tenant_id = ? AND customer_id = ?)'; $params[]=$tenant; $params[]=$customerId; }
            elseif ($entity==='Customer') { $roleConditions[]='(tenant_id = ? AND id = ?)'; $params[]=$tenant; $params[]=$customerId; }
            elseif (in_array($entity,['Package','Tenant'],true)) { $roleConditions[]='('.$tenantColumn.' = ?)'; $params[]=$tenant; }
        }
        if ($role==='reseller') {
            if (in_array($entity,['Voucher','ResellerStock','StockMutation'],true)) { $roleConditions[]='(tenant_id = ? AND reseller_id = ?)'; $params[]=$tenant; $params[]=$memberId; }
            elseif ($entity==='TenantMember') { $roleConditions[]='(tenant_id = ? AND id = ?)'; $params[]=$tenant; $params[]=$memberId; }
            elseif (in_array($entity,['Package','Tenant'],true)) { $roleConditions[]='('.$tenantColumn.' = ?)'; $params[]=$tenant; }
        }
        if ($role==='technician') {
            if ($entity==='Ticket') { $roleConditions[]='(tenant_id = ? AND assigned_to = ?)'; $params[]=$tenant; $params[]=$memberId; }
            elseif ($entity==='TenantMember') { $roleConditions[]='(tenant_id = ? AND id = ?)'; $params[]=$tenant; $params[]=$memberId; }
            elseif (in_array($entity,['Customer','Package','Tenant'],true)) { $roleConditions[]='('.$tenantColumn.' = ?)'; $params[]=$tenant; }
        }
    }
    if (!$context['platform_admin']) $clauses[]=$roleConditions?'('.implode(' OR ',$roleConditions).')':'1=0';
    return implode(' AND ',$clauses);
}

function arq_entity_validate(array $definition, array $input, bool $creating): array
{
    $allowed=[];
    foreach ($definition['fields'] as $name=>$spec) {
        if ($name==='id' || str_ends_with($name,'_date') && in_array($name,['created_date','updated_date'],true)) continue;
        if (!array_key_exists($name,$input)) continue;
        $value=$input[$name];
        if ($value!==null && in_array($spec[1],['number','bool'],true) && !is_numeric($value)) arq_entity_error('Nilai numerik tidak valid: '.$name,422);
        if ($value!==null && $spec[1]==='enum' && !in_array($value,$spec[2],true)) arq_entity_error('Nilai pilihan tidak valid: '.$name,422);
        if (is_array($value)||is_object($value)) arq_entity_error('Nilai kolom tidak valid: '.$name,422);
        $allowed[$spec[0]]=$value;
    }
    if ($creating) foreach ($definition['required'] as $name) if (!array_key_exists($name,$input)||$input[$name]===null||$input[$name]==='') arq_entity_error('Kolom wajib belum diisi: '.$name,422);
    return $allowed;
}

function arq_entity_select(array $definition): string
{
    $items=[];
    foreach ($definition['fields'] as $name=>$spec) $items[]='`'.$spec[0].'` AS `'.$name.'`';
    if ($definition['table']==='tenant_memberships') { $items[]='legacy_member_id AS legacy_member_id'; $items[]='CASE WHEN account_id IS NULL THEN 0 ELSE 1 END AS account_linked'; }
    return implode(',',$items);
}

function arq_entity_roles_for_tenant(array $context, string $tenantId): array
{
    if ($context['platform_admin']) return ['platform_admin'];
    return isset($context['by_tenant'][$tenantId]) ? [$context['by_tenant'][$tenantId]['app_role']] : [];
}

function arq_entity_role_for_tenant(array $context, string $tenantId): ?string
{
    return $context['platform_admin'] ? 'platform_admin' : ($context['by_tenant'][$tenantId]['app_role'] ?? null);
}

function arq_entity_handle(string $method, string $path): bool
{
    if (!preg_match('#^/entities/([A-Za-z]+)(?:/(aggregate|count|bulk|delete-many)|/([^/]+))?$#',$path,$m)) return false;
    $entity=$m[1]; $operation=($m[2]??'')!==''?$m[2]:null; $id=($m[3]??'')!==''?$m[3]:null; $definitions=arq_entity_definitions();
    if (!isset($definitions[$entity])) arq_entity_error('Entitas tidak dikenal.',404);
    $definition=$definitions[$entity]; $definition['name']=$entity; $account=require_account(); $context=arq_entity_context($account); $pdo=db();

    if ($entity==='Tenant') {
        if ($method==='GET' && !$id) {
            $filter=[]; $raw=$_GET['filter']??''; if ($raw!=='') { $filter=json_decode((string)$raw,true); if (!is_array($filter)) arq_entity_error('Filter tidak valid.',422); }
            $params=[]; $where=arq_entity_filter_sql($definition,$filter,$context,$params);
            $sort=(string)($_GET['sort']??'name'); $desc=str_starts_with($sort,'-'); $sortField=ltrim($sort,'-'); $order=arq_entity_field_sql($definition,$sortField).($desc?' DESC':' ASC');
            $limit=max(1,min(500,(int)($_GET['limit']??100))); $offset=max(0,min(100000,(int)($_GET['offset']??0)));
            $q=$pdo->prepare('SELECT '.arq_entity_select($definition).' FROM tenants WHERE '.$where.' ORDER BY '.$order.' LIMIT '.$limit.' OFFSET '.$offset); $q->execute($params); respond(['items'=>$q->fetchAll()]);
        }
        if (!$context['platform_admin'] && !isset($context['by_tenant'][$id])) arq_entity_error('Akses ditolak.',403);
    }

    $tenantId='';
    if ($id) {
        $scopeColumn=$entity==='Tenant'?'id':'tenant_id';
        $q=$pdo->prepare('SELECT `'.$scopeColumn.'` FROM `'.$definition['table'].'` WHERE id=?'); $q->execute([$id]); $tenantId=(string)($q->fetchColumn()?:'');
    }
    if ($method==='GET' && $operation===null) {
        if ($id!==null) {
            $filter=['id'=>$id]; $params=[]; $where=arq_entity_filter_sql($definition,$filter,$context,$params); $q=$pdo->prepare('SELECT '.arq_entity_select($definition).' FROM `'.$definition['table'].'` WHERE '.$where.' LIMIT 1'); $q->execute($params); $row=$q->fetch(); if (!$row) arq_entity_error('Data tidak ditemukan.',404); respond($row);
        }
        $filter=[]; $raw=$_GET['filter']??''; if ($raw!=='') { $filter=json_decode((string)$raw,true); if (!is_array($filter)) arq_entity_error('Filter tidak valid.',422); }
        $params=[]; $where=arq_entity_filter_sql($definition,$filter,$context,$params); $sort=(string)($_GET['sort']??'-created_date'); $desc=str_starts_with($sort,'-'); $field=ltrim($sort,'-'); $order=arq_entity_field_sql($definition,$field).($desc?' DESC':' ASC');
        $limit=max(1,min(500,(int)($_GET['limit']??100))); $offset=max(0,min(100000,(int)($_GET['offset']??0))); $q=$pdo->prepare('SELECT '.arq_entity_select($definition).' FROM `'.$definition['table'].'` WHERE '.$where.' ORDER BY '.$order.' LIMIT '.$limit.' OFFSET '.$offset); $q->execute($params); respond(['items'=>$q->fetchAll()]);
    }
    if ($method==='POST' && $operation==='count') {
        $input=body(); $filter=is_array($input['query']??null)?$input['query']:[]; $params=[]; $where=arq_entity_filter_sql($definition,$filter,$context,$params); $q=$pdo->prepare('SELECT COUNT(*) FROM `'.$definition['table'].'` WHERE '.$where); $q->execute($params); respond(['count'=>(int)$q->fetchColumn()]);
    }
    if ($method==='POST' && $operation==='aggregate') return arq_entity_aggregate($pdo,$definition,$context);
    if ($method==='POST' && $operation==='bulk') return arq_entity_bulk($pdo,$definition,$context);
    if ($method==='POST' && $operation==='delete-many') return arq_entity_delete_many($pdo,$definition,$context);

    if ($method==='POST' && $id===null && $operation===null) {
        require_csrf(); $input=body(); $scopeTenant=(string)($input['tenant_id']??''); $role=arq_entity_role_for_tenant($context,$scopeTenant);
        if (!arq_entity_role_allowed($entity,'create',$role,$context['platform_admin'])) arq_entity_error('Akses membuat data ditolak.',403);
        if ($entity!=='Tenant' && !isset($context['by_tenant'][$scopeTenant]) && !$context['platform_admin']) arq_entity_error('Tenant tidak diizinkan.',403);
        if ($entity!=='Tenant' && !$context['platform_admin']) { $check=$pdo->prepare('SELECT id FROM tenants WHERE id=?'); $check->execute([$scopeTenant]); if (!$check->fetchColumn()) arq_entity_error('Tenant tidak ditemukan.',404); }
        if (in_array($entity,['StockMutation','ActivityLog'],true) && !in_array($role,['owner_admin','admin','reseller','technician','platform_admin'],true)) arq_entity_error('Akses membuat data ditolak.',403);
        if ($role==='reseller' && in_array($entity,['ResellerStock','StockMutation'],true) && ($input['reseller_id']??null)!==($context['by_tenant'][$scopeTenant]['member_id']??null)) arq_entity_error('Data hanya dapat dibuat untuk akun reseller sendiri.',403);
        if ($role==='technician' && $entity==='Ticket') { $input['assigned_to']=$context['by_tenant'][$scopeTenant]['member_id']; $input['created_by_name']=$account['full_name']; $input['status']='open'; $input['resolved_date']=null; $input['resolution_note']=null; }
        if ($role==='customer' && $entity==='Ticket') { $input['customer_id']=$context['by_tenant'][$scopeTenant]['customer_id']; $input['status']='open'; $input['assigned_to']=null; $input['assigned_to_name']=null; $input['resolution_note']=null; $input['created_by_name']=$account['full_name']; }
        $values=arq_entity_validate($definition,$input,true); $values['id']=isset($input['id'])?(string)$input['id']:arq_entity_uuid();
        if (in_array($entity,['ActivityLog','StockMutation'],true)) $values['actor_name']=$account['full_name'];
        $cols=array_keys($values); $sql='INSERT INTO `'.$definition['table'].'` (`'.implode('`,`',$cols).'`) VALUES ('.implode(',',array_fill(0,count($cols),'?')).')';
        $q=$pdo->prepare($sql); $q->execute(array_values($values));
        $q=$pdo->prepare('SELECT '.arq_entity_select($definition).' FROM `'.$definition['table'].'` WHERE id=?'); $q->execute([$values['id']]); respond($q->fetch(),201);
    }
    if ($method==='PUT' && $id!==null && $operation===null) {
        require_csrf(); $input=body(); $scopeColumn=$entity==='Tenant'?'id':'tenant_id'; $select=['`'.$scopeColumn.'` AS scope_tenant'];
        foreach (['reseller_id','assigned_to','customer_id'] as $field) if (isset($definition['fields'][$field])) $select[]='`'.$definition['fields'][$field][0].'`';
        $q=$pdo->prepare('SELECT '.implode(',',$select).' FROM `'.$definition['table'].'` WHERE id=?'); $q->execute([$id]); $row=$q->fetch(); if (!$row) arq_entity_error('Data tidak ditemukan.',404);
        $scopeTenant=(string)$row['scope_tenant']; $role=arq_entity_role_for_tenant($context,$scopeTenant);
        if (!arq_entity_role_allowed($entity,'update',$role,$context['platform_admin'])) arq_entity_error('Akses mengubah data ditolak.',403);
        if (!$context['platform_admin']&&!$role) arq_entity_error('Akses tenant ditolak.',403);
        if ($entity==='Voucher' && $role==='reseller' && ($row['reseller_id']??'')!==($context['by_tenant'][$scopeTenant]['member_id']??'')) arq_entity_error('Voucher bukan milik reseller ini.',403);
        if ($entity==='Ticket' && $role==='technician' && ($row['assigned_to']??'')!==($context['by_tenant'][$scopeTenant]['member_id']??'')) arq_entity_error('Tiket tidak ditugaskan kepada teknisi ini.',403);
        if ($entity==='Ticket' && $role==='customer') arq_entity_error('Pelanggan tidak dapat mengubah tiket yang sudah dibuat.',403);
        if ($role==='technician' && $entity==='Ticket') { unset($input['assigned_to'],$input['customer_id'],$input['tenant_id']); }
        if ($role==='reseller' && $entity==='Voucher') { unset($input['reseller_id']); }
        if ($role==='reseller' && $entity==='ResellerStock' && isset($input['reseller_id']) && $input['reseller_id']!==$row['reseller_id']) arq_entity_error('Stok tidak dapat dipindahkan ke reseller lain.',403);
        if ($entity==='ActivityLog'||$entity==='StockMutation') arq_entity_error('Data ini hanya dapat ditambahkan.',403);
        unset($input['id'],$input['tenant_id']); $values=arq_entity_validate($definition,$input,false); if (!$values) respond(['updated'=>true]);
        $set=[]; foreach ($values as $col=>$value) $set[]='`'.$col.'`=?'; $params=[...array_values($values),$id]; $q=$pdo->prepare('UPDATE `'.$definition['table'].'` SET '.implode(',',$set).' WHERE id=?'); $q->execute($params); $q=$pdo->prepare('SELECT '.arq_entity_select($definition).' FROM `'.$definition['table'].'` WHERE id=?'); $q->execute([$id]); respond($q->fetch());
    }
    if ($method==='DELETE' && $id!==null && $operation===null) {
        require_csrf(); $scopeColumn=$entity==='Tenant'?'id':'tenant_id'; $q=$pdo->prepare('SELECT `'.$scopeColumn.'` FROM `'.$definition['table'].'` WHERE id=?'); $q->execute([$id]); $scopeTenant=(string)($q->fetchColumn()?:''); if ($scopeTenant==='') arq_entity_error('Data tidak ditemukan.',404);
        $role=arq_entity_role_for_tenant($context,$scopeTenant); if (!arq_entity_role_allowed($entity,'delete',$role,$context['platform_admin'])) arq_entity_error('Akses menghapus data ditolak.',403);
        if (in_array($entity,['ActivityLog','StockMutation'],true)) arq_entity_error('Data ini hanya dapat ditambahkan.',403);
        $params=[]; $where=arq_entity_filter_sql($definition,['id'=>$id],$context,$params); $q=$pdo->prepare('DELETE FROM `'.$definition['table'].'` WHERE '.$where); $q->execute($params); respond(['deleted'=>true]);
    }
    arq_entity_error('Metode tidak didukung.',405);
}

function arq_entity_uuid(): string { $b=random_bytes(16); $b[6]=chr((ord($b[6])&15)|64); $b[8]=chr((ord($b[8])&63)|128); $h=bin2hex($b); return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20); }

function arq_entity_aggregate(PDO $pdo,array $definition,array $context): never
{
    require_csrf(); $input=body(); $filter=is_array($input['query']??null)?$input['query']:[]; $params=[]; $where=arq_entity_filter_sql($definition,$filter,$context,$params); $group=$input['groupBy']??null; $sums=$input['sum']??[]; if (is_string($sums)) $sums=[$sums]; if (!is_array($sums)) arq_entity_error('Agregasi sum tidak valid.',422);
    $select=[]; $groupSql=''; if ($group!==null) { $select[]=arq_entity_field_sql($definition,(string)$group).' AS `'.(string)$group.'`'; $groupSql=' GROUP BY '.arq_entity_field_sql($definition,(string)$group); }
    $select[]='COUNT(*) AS `count`'; foreach ($sums as $field) { if (!isset($definition['fields'][$field])||$definition['fields'][$field][1]!=='number') arq_entity_error('Kolom agregasi tidak valid.',422); $select[]='COALESCE(SUM('.arq_entity_field_sql($definition,$field).'),0) AS `sum_'.$field.'`'; }
    $sort=(string)($input['sort']??''); $sortSql=''; if ($sort!=='') { $desc=str_starts_with($sort,'-'); $name=ltrim($sort,'-'); if ($name==='count'||in_array(substr($name,4),$sums,true)&&str_starts_with($name,'sum_')) $sortSql=' ORDER BY `'.$name.'`'.($desc?' DESC':' ASC'); }
    $q=$pdo->prepare('SELECT '.implode(',',$select).' FROM `'.$definition['table'].'` WHERE '.$where.$groupSql.$sortSql); $q->execute($params); respond(['rows'=>$q->fetchAll()]);
}

function arq_entity_bulk(PDO $pdo,array $definition,array $context): never
{
    require_csrf(); $input=body(); $action=$input['action']??''; $rows=$input['items']??[]; if (!is_array($rows)||count($rows)>500) arq_entity_error('Data bulk tidak valid.',422); $pdo->beginTransaction();
    try {
        foreach ($rows as $item) {
            if ($action==='create') {
                if (!is_array($item)) arq_entity_error('Item bulk tidak valid.',422);
                $tenant=(string)($item['tenant_id']??''); $role=arq_entity_role_for_tenant($context,$tenant);
                if (!arq_entity_role_allowed($definition['name'],'create',$role,$context['platform_admin'])) arq_entity_error('Akses membuat data ditolak.',403);
                if ($definition['name']!=='Tenant'&&!$context['platform_admin']) { $check=$pdo->prepare('SELECT id FROM tenants WHERE id=?'); $check->execute([$tenant]); if (!$check->fetchColumn()) arq_entity_error('Tenant tidak ditemukan.',404); }
                if ($role==='reseller'&&in_array($definition['name'],['ResellerStock','StockMutation'],true)&&($item['reseller_id']??null)!==($context['by_tenant'][$tenant]['member_id']??null)) arq_entity_error('Data hanya dapat dibuat untuk reseller sendiri.',403);
                if ($role==='technician'&&$definition['name']==='Ticket') { $item['assigned_to']=$context['by_tenant'][$tenant]['member_id']; $item['created_by_name']=$context['account_name']??''; $item['status']='open'; $item['resolved_date']=null; $item['resolution_note']=null; }
                if ($role==='customer'&&$definition['name']==='Ticket') { $item['customer_id']=$context['by_tenant'][$tenant]['customer_id']; $item['status']='open'; $item['assigned_to']=null; $item['assigned_to_name']=null; $item['resolution_note']=null; $item['created_by_name']=$context['account_name']??''; }
                $values=arq_entity_validate($definition,$item,true); $values['id']=isset($item['id'])?(string)$item['id']:arq_entity_uuid();
                if (in_array($definition['name'],['ActivityLog','StockMutation'],true)) $values['actor_name']=$context['account_name']??'';
                $columns=array_keys($values); $q=$pdo->prepare('INSERT INTO `'.$definition['table'].'` (`'.implode('`,`',$columns).'`) VALUES ('.implode(',',array_fill(0,count($columns),'?')).')'); $q->execute(array_values($values)); continue;
            }
            if (!is_array($item)||empty($item['id'])) arq_entity_error('ID wajib ada pada setiap item.',422);
            $id=(string)$item['id']; $scopeColumn=$definition['name']==='Tenant'?'id':'tenant_id'; $select=['`'.$scopeColumn.'` AS scope_tenant']; foreach(['reseller_id','assigned_to'] as $field) if(isset($definition['fields'][$field])) $select[]='`'.$definition['fields'][$field][0].'`';
            $q=$pdo->prepare('SELECT '.implode(',',$select).' FROM `'.$definition['table'].'` WHERE id=? FOR UPDATE'); $q->execute([$id]); $old=$q->fetch(); if (!$old) arq_entity_error('Data tidak ditemukan.',404); $role=arq_entity_role_for_tenant($context,(string)$old['scope_tenant']);
            if ($action==='delete') { if (in_array($definition['name'],['ActivityLog','StockMutation'],true)) arq_entity_error('Data ini hanya dapat ditambahkan.',403); if (!arq_entity_role_allowed($definition['name'],'delete',$role,$context['platform_admin'])) arq_entity_error('Akses hapus ditolak.',403); $q=$pdo->prepare('DELETE FROM `'.$definition['table'].'` WHERE id=?'); $q->execute([$id]); continue; }
            if ($action==='update') {
                if (!arq_entity_role_allowed($definition['name'],'update',$role,$context['platform_admin'])) arq_entity_error('Akses ubah ditolak.',403);
                if ($definition['name']==='Voucher'&&$role==='reseller'&&($old['reseller_id']??'')!==($context['by_tenant'][$old['scope_tenant']]['member_id']??'')) arq_entity_error('Voucher bukan milik reseller ini.',403);
                if ($definition['name']==='Ticket'&&$role==='technician'&&($old['assigned_to']??'')!==($context['by_tenant'][$old['scope_tenant']]['member_id']??'')) arq_entity_error('Tiket tidak ditugaskan kepada teknisi ini.',403);
                if (in_array($definition['name'],['ActivityLog','StockMutation'],true)) arq_entity_error('Data ini hanya dapat ditambahkan.',403);
                if ($role==='technician'&&$definition['name']==='Ticket') unset($item['assigned_to'],$item['customer_id'],$item['tenant_id']);
                if ($role==='reseller'&&$definition['name']==='Voucher') unset($item['reseller_id']);
                $item=array_diff_key($item,['id'=>true,'tenant_id'=>true]); $values=arq_entity_validate($definition,$item,false); if (!$values) continue; $set=[]; foreach($values as $col=>$value)$set[]='`'.$col.'`=?'; $q=$pdo->prepare('UPDATE `'.$definition['table'].'` SET '.implode(',',$set).' WHERE id=?'); $q->execute([...array_values($values),$id]); continue;
            }
            arq_entity_error('Aksi bulk tidak didukung.',422);
        }
        $pdo->commit(); respond(['updated'=>count($rows)]);
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}

function arq_entity_delete_many(PDO $pdo,array $definition,array $context): never
{
    if (in_array($definition['name'],['ActivityLog','StockMutation'],true)) arq_entity_error('Data ini hanya dapat ditambahkan.',403);
    require_csrf(); $input=body(); $filter=is_array($input['query']??null)?$input['query']:[]; $params=[]; $where=arq_entity_filter_sql($definition,$filter,$context,$params); $scopeColumn=$definition['name']==='Tenant'?'id':'tenant_id'; $q=$pdo->prepare('SELECT `'.$scopeColumn.'` AS scope_tenant FROM `'.$definition['table'].'` WHERE '.$where.' LIMIT 501'); $q->execute($params); $rows=$q->fetchAll(); if (count($rows)>500) arq_entity_error('Hapus massal dibatasi 500 baris.',422);
    foreach ($rows as $row) { $role=arq_entity_role_for_tenant($context,(string)$row['scope_tenant']); if (!arq_entity_role_allowed($definition['name'],'delete',$role,$context['platform_admin'])) arq_entity_error('Akses hapus ditolak.',403); }
    $q=$pdo->prepare('DELETE FROM `'.$definition['table'].'` WHERE '.$where); $q->execute($params); respond(['deleted'=>$q->rowCount()]);
}
