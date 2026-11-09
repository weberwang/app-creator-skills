-- 只读节点采样模板：执行前替换路径；不要把模板输出当作实际采集。
local HttpService = game:GetService("HttpService")
local paths = { { "game", "Workspace", "替换为实际实例名" } }
local properties = { "Image", "MeshId", "TextureID", "Texture", "SoundId", "AnimationId", "Video", "ColorMap", "NormalMap", "MetalnessMap", "RoughnessMap" }

-- 每一级必须唯一，避免同名实例被错误绑定。
local function resolveUnique(path)
	assert(path[1] == "game", "实例路径必须从 game 开始")
	local current = game
	for i = 2, #path do
		local matches = {}
		for _, child in ipairs(current:GetChildren()) do
			if child.Name == path[i] then table.insert(matches, child) end
		end
		assert(#matches == 1, "路径不存在或有同名实例")
		current = matches[1]
	end
	return current
end

-- 显式序列化二维值，避免引擎 userdata 不能进入 JSON。
local function vector2(value)
	return { x = value.X, y = value.Y }
end

-- 保留每轴 scale 与 offset；负 offset 可用于右下边距。
local function udim2(value)
	return { xScale = value.X.Scale, xOffset = value.X.Offset, yScale = value.Y.Scale, yOffset = value.Y.Offset }
end

-- 节点属性显式构建对象，空属性仍输出 {} 而非不稳定的空表 JSON。
local function add(values, name, value)
	table.insert(values, HttpService:JSONEncode(name) .. ":" .. HttpService:JSONEncode(value))
end

local nodes, queue, seen = {}, {}, {}
-- 控制器本身也需按真实路径回读；去重避免同一路径在 JSON 中出现两次。
local function enqueue(path)
	local key = HttpService:JSONEncode(path)
	if not seen[key] then seen[key] = true; table.insert(queue, path) end
end
for _, path in ipairs(paths) do enqueue(path) end

local index = 1
while index <= #queue do
	local path = queue[index]
	index += 1
	local instance = resolveUnique(path)
	local values = {}
	for _, property in ipairs(properties) do
		local ok, value = pcall(function() return instance[property] end)
		if ok and type(value) == "string" then add(values, property, value) end
	end
	if instance:IsA("GuiBase2d") then
		add(values, "IsGuiBase2d", true)
		add(values, "AbsolutePosition", vector2(instance.AbsolutePosition))
		add(values, "AbsoluteSize", vector2(instance.AbsoluteSize))
		add(values, "AbsoluteRotation", instance.AbsoluteRotation)
		local controllers = {}
		local sizeModifiers = {}
		for _, child in ipairs(instance:GetChildren()) do
			if child:IsA("UILayout") then
				local childPath = table.clone(path)
				table.insert(childPath, child.Name)
				table.insert(controllers, { instancePath = childPath, className = child.ClassName })
				enqueue(childPath)
			end
			if child:IsA("UIConstraint") or child:IsA("UIScale") then
				local childPath = table.clone(path)
				table.insert(childPath, child.Name)
				table.insert(sizeModifiers, { instancePath = childPath, className = child.ClassName })
			end
		end
		-- 显式输出空数组，不能依赖 Lua 空表编码的歧义。
		local encoded = #controllers == 0 and "[]" or HttpService:JSONEncode(controllers)
		table.insert(values, HttpService:JSONEncode("LayoutControllers") .. ":" .. encoded)
		local encodedModifiers = #sizeModifiers == 0 and "[]" or HttpService:JSONEncode(sizeModifiers)
		table.insert(values, HttpService:JSONEncode("SizeModifiers") .. ":" .. encodedModifiers)
	end
	if instance:IsA("ScreenGui") then
		add(values, "ScreenInsets", instance.ScreenInsets.Name)
		add(values, "ClipToDeviceSafeArea", instance.ClipToDeviceSafeArea)
	end
	if instance:IsA("GuiObject") then
		add(values, "IsGuiObject", true)
		add(values, "Position", udim2(instance.Position))
		add(values, "Size", udim2(instance.Size))
		add(values, "AnchorPoint", vector2(instance.AnchorPoint))
		add(values, "AutomaticSize", instance.AutomaticSize.Name)
		add(values, "SizeConstraint", instance.SizeConstraint.Name)
		local flexItems = {}
		for _, child in ipairs(instance:GetChildren()) do
			if child:IsA("UIFlexItem") then
				local childPath = table.clone(path)
				table.insert(childPath, child.Name)
				table.insert(flexItems, { instancePath = childPath, className = child.ClassName })
				enqueue(childPath)
			end
		end
		local encoded = #flexItems == 0 and "[]" or HttpService:JSONEncode(flexItems)
		table.insert(values, HttpService:JSONEncode("FlexItems") .. ":" .. encoded)
	end
	if instance:IsA("UIGridStyleLayout") then
		for _, property in ipairs({ "FillDirection", "HorizontalAlignment", "VerticalAlignment", "SortOrder" }) do
			add(values, property, instance[property].Name)
		end
	end
	if instance:IsA("UIListLayout") then
		add(values, "Padding", { scale = instance.Padding.Scale, offset = instance.Padding.Offset })
		add(values, "Wraps", instance.Wraps)
		add(values, "HorizontalFlex", instance.HorizontalFlex.Name)
		add(values, "VerticalFlex", instance.VerticalFlex.Name)
		add(values, "ItemLineAlignment", instance.ItemLineAlignment.Name)
	elseif instance:IsA("UIGridLayout") then
		add(values, "CellSize", udim2(instance.CellSize))
		add(values, "CellPadding", udim2(instance.CellPadding))
		add(values, "FillDirectionMaxCells", instance.FillDirectionMaxCells)
		add(values, "StartCorner", instance.StartCorner.Name)
	end
	if instance:IsA("UIFlexItem") then
		add(values, "FlexMode", instance.FlexMode.Name)
		add(values, "GrowRatio", instance.GrowRatio)
		add(values, "ShrinkRatio", instance.ShrinkRatio)
		add(values, "ItemLineAlignment", instance.ItemLineAlignment.Name)
	end
	table.insert(nodes, "{\"instancePath\":" .. HttpService:JSONEncode(path) .. ",\"className\":" .. HttpService:JSONEncode(instance.ClassName) .. ",\"properties\":{" .. table.concat(values, ",") .. "}}")
end
return "{\"nodes\":[" .. table.concat(nodes, ",") .. "]}"
