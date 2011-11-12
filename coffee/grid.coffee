class Grid
	constructor: (@waterLevel = 0.0) ->
		@triangles = []
		@maxHeight = 0.0
		@intervalX = [0.0, 0.0]
		@intervalZ = [0.0, 0.0]

	
	addTriangle: (face3) ->
		# discard all triangles that are not relevant for reflection:
		# if they are completely under water or are almost parallel to the water (pointing upwards)
		if face3.a.y < @waterLevel and face3.b.y < @waterLevel and face3.c.y < @waterLevel or face3.normal.y > 0.9
			return
		
		@triangles.push(face3)
		
		for point in [face3.a, face3.b, face3.c]
			if @maxHeight < point.y
				@maxHeight = point.y

			if @intervalX[0] > point.x
				@intervalX[0] = point.x
			if @intervalX[1] < point.x
				@intervalX[1] = point.x

			if @intervalZ[0] > point.z
				@intervalZ[0] = point.z
			if @intervalZ[1] < point.z
				@intervalZ[1] = point.z
				
		@preCalcAcc(face3)


	preCalcAcc: (face3) ->
		b = (new THREE.Vector3).sub(face3.c, face3.a)
		c = (new THREE.Vector3).sub(face3.b, face3.a)
		N = (new THREE.Vector3).cross(c, b)
		
		face3.n_u = N.x / N.z
		face3.n_v = N.y / N.z
		face3.n_d = N.dot(face3.a) / N.z
		
		div = b.x * c.y - b.y * c.x
		
		face3.b_nu = -b.y / div
		face3.b_nv =  b.x / div
		face3.b_d  = (b.y * face3.a.x - b.x * face3.a.y) / div

		face3.c_nu = -c.y / div
		face3.c_nv =  c.x / div
		face3.c_d  = (c.y * face3.a.x - c.x * face3.a.y) / div
		

	build: ->
		@size = Math.floor Math.sqrt @triangles.length
		@cellSizeX = (@intervalX[1] - @intervalX[0]) / @size
		@cellSizeZ = (@intervalZ[1] - @intervalZ[0]) / @size
		row = [] for i in [1..@size + 1]
		@cells = row for i in [1..@size + 1]

		@addTriangleToGrid triangle for triangle in @triangles


	addTriangleToGrid: (face3) ->
		cells = []
		for point in [face3.a, face3.b, face3.c]
			x = Math.floor point.x / @cellSizeX
			z = Math.floor point.z / @cellSizeZ
			
			add = True
			for cell in cells
				if cell[0] == x and cell[1] == z
					add = False
					break
					
			if add
				cells.push [x, z]
		
		for cell in cells
			@cells[cell[0]][cell[1]].push(face3)


	triangleToShader: (face3, index) ->
		"""
		
		// triangle #{ index }
		accs[#{ index }].n_u = #{ face3.n_u };
		accs[#{ index }].n_v = #{ face3.n_v };
		accs[#{ index }].n_d = #{ face3.n_d };

		accs[#{ index }].b_nu = #{ face3.b_nu };
		accs[#{ index }].b_nv = #{ face3.b_nv };
		accs[#{ index }].b_d = #{ face3.b_d };

		accs[#{ index }].c_nu = #{ face3.c_nu };
		accs[#{ index }].c_nv = #{ face3.c_nv };
		accs[#{ index }].c_d = #{ face3.c_d };
		"""
		
	trianglesToShader: ->
		@triangleToShader(face3, index) for face3, index in @triangles
	
		
	fragmentShader: ->
		"""
		// Fast ray triangle intersection algorithm after PhD from Ingo Wald
		
		struct TriAccel
		{
			// plane:
			float n_u; //!< == normal.u / normal.k
			float n_v; //!< == normal.v / normal.k
			float n_d; //!< constant of plane equation
			
			// line equation for line ac
			float b_nu;
			float b_nv;
			float b_d;
			
			// line equation for line ab
			float c_nu;
			float c_nv;
			float c_d;
		};
		
		const int TRIANGLE_NUM = #{ @triangles.length };
		
		TriAccel accs[TRIANGLE_NUM];
		#{ @trianglesToShader() }
		
		const float MIN_DIST = 0.01;
		const float MAX_DIST = 100.0;
		
		bool intersect(in TriAccel acc, in vec3 rayOrg, in vec3 rayDir, out float lambda, out float mue) {
			// we always project onto XY Plane
			const float nd = 1.0 / (rayDir.z + acc.n_u * rayDir.x + acc.n_v * rayDir.y);
			const float f = (acc.n_d - rayOrg.z - acc.n_u * rayOrg.x - acc.n_v * rayOrg.y) * nd;
			
			// check for valid distance
			if (!(MAX_DIST > f && f > MIN_DIST)) {
				return false;
			}
			
			// compute hitpoint positions on uv plane
			const float hu = rayOrg.x + f * rayDir.x;
			const float hv = rayOrg.y + f * rayDir.y;
			
			// check first barycentric coordinate
			lambda = hu * acc.b_nu + hv * acc.b_nv + acc.b_d;
			if (lambda < 0.0) {
				return false;
			}
			
			// check second barycentric coordinate
			mue = hu * acc.c_nu + hv * acc.c_nv + acc.c_d;
			if (mue < 0.0) {
				return false;
			}

			// check third barycentric coordinate
			if (lambda + mue > 1.0) {
				return false;
			}
			
			// we have a valid hitpoint here. return values.
			return true;
		}
		
		// returns the color of the fragment
		vec4 traceRay(vec3 rayOrg, vec3 rayDir) {
			float beta, gamma;
			
			for (int i = 0; i < TRIANGLE_NUM; ++i) {
				
				if (intersect(accs[i], rayOrg, rayDir, beta, gamma)) {
					return vec4(1.0, 0.0, 0.0, 1.0);
				}
			}
			
			return vec4(0.3, 0.3, 0.3, 1.0);
		}
		"""